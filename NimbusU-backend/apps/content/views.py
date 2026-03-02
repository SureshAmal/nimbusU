"""Views for the content app."""

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrFaculty, IsOwnerOrAdmin

from .models import Bookmark, Content, ContentAccessLog, ContentFolder, ContentTag
from .serializers import (
    BookmarkSerializer,
    ContentAccessLogSerializer,
    ContentDetailSerializer,
    ContentFolderSerializer,
    ContentListSerializer,
    ContentTagSerializer,
)


# ─── Folders ────────────────────────────────────────────────────────────


class ContentFolderListCreateView(generics.ListCreateAPIView):
    queryset = ContentFolder.objects.select_related("created_by").all()
    serializer_class = ContentFolderSerializer
    filterset_fields = ["course_offering", "parent", "visibility"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ContentFolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ContentFolder.objects.all()
    serializer_class = ContentFolderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]


# ─── Content ────────────────────────────────────────────────────────────


class ContentListCreateView(generics.ListCreateAPIView):
    filterset_fields = ["course_offering", "content_type", "folder", "visibility"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        return Content.objects.select_related("uploaded_by").prefetch_related("tags").all()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ContentDetailSerializer
        return ContentListSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        content = serializer.save(uploaded_by=self.request.user)
        if content.file:
            content.file_size = content.file.size
            content.save(update_fields=["file_size"])


class ContentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContentDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return Content.objects.select_related("uploaded_by").prefetch_related("tags").all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ContentAccessLog.objects.create(
            content=instance, user=request.user, action="viewed"
        )
        serializer = self.get_serializer(instance)
        return Response({"status": "success", "data": serializer.data})


class ContentDownloadView(APIView):
    """GET /api/v1/content/{id}/download/ — returns file URL and logs download."""

    @extend_schema(
        responses={200: inline_serializer("ContentDownloadResponse", {
            "status": serializers.CharField(),
            "data": serializers.DictField(),
        })},
        tags=["Content"],
    )
    def get(self, request, pk):
        try:
            content = Content.objects.get(pk=pk)
        except Content.DoesNotExist:
            return Response(
                {"status": "error", "message": "Content not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not content.file:
            return Response(
                {"status": "error", "message": "No file attached."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ContentAccessLog.objects.create(
            content=content, user=request.user, action="downloaded"
        )
        return Response(
            {"status": "success", "data": {"file_url": content.file.url}},
        )


class ContentStatsView(APIView):
    """GET /api/v1/content/{id}/stats/"""

    @extend_schema(
        responses={200: inline_serializer("ContentStatsResponse", {
            "status": serializers.CharField(),
            "data": inline_serializer("ContentStatsData", {
                "total_views": serializers.IntegerField(),
                "total_downloads": serializers.IntegerField(),
                "bookmarks": serializers.IntegerField(),
            }),
        })},
        tags=["Content"],
    )
    def get(self, request, pk):
        try:
            content = Content.objects.get(pk=pk)
        except Content.DoesNotExist:
            return Response(
                {"status": "error", "message": "Content not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        views = content.access_logs.filter(action="viewed").count()
        downloads = content.access_logs.filter(action="downloaded").count()
        return Response(
            {
                "status": "success",
                "data": {
                    "total_views": views,
                    "total_downloads": downloads,
                    "bookmarks": content.bookmarks.count(),
                },
            }
        )


class RecentContentView(generics.ListAPIView):
    """GET /api/v1/content/recent/"""

    serializer_class = ContentListSerializer

    def get_queryset(self):
        return (
            Content.objects.select_related("uploaded_by")
            .prefetch_related("tags")
            .filter(is_published=True)
            .order_by("-created_at")[:20]
        )


# ─── Tags ───────────────────────────────────────────────────────────────


class ContentTagListCreateView(generics.ListCreateAPIView):
    queryset = ContentTag.objects.all()
    serializer_class = ContentTagSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]


# ─── Bookmarks ──────────────────────────────────────────────────────────


class BookmarkListCreateView(generics.ListCreateAPIView):
    serializer_class = BookmarkSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Bookmark.objects.none()
        return Bookmark.objects.filter(user=self.request.user).select_related("content")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BookmarkDeleteView(generics.DestroyAPIView):
    serializer_class = BookmarkSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Bookmark.objects.none()
        return Bookmark.objects.filter(user=self.request.user)
