"""Views for the content app."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrFaculty, IsOwnerOrAdmin

from .models import Bookmark, Content, ContentAccessLog, ContentComment, ContentFolder, ContentTag, ContentVersion
from .serializers import (
    BookmarkSerializer,
    ContentAccessLogSerializer,
    ContentDetailSerializer,
    ContentFolderSerializer,
    ContentListSerializer,
    ContentTagSerializer,
    ContentVersionSerializer,
    ContentCommentSerializer,
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


# ─── Content Versions ───────────────────────────────────────────────────


class ContentVersionListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/content/{id}/versions/"""

    serializer_class = ContentVersionSerializer

    def get_queryset(self):
        return ContentVersion.objects.filter(
            content_id=self.kwargs["pk"]
        ).select_related("uploaded_by")

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        content = Content.objects.get(pk=self.kwargs["pk"])
        latest = content.versions.order_by("-version_number").first()
        next_version = (latest.version_number + 1) if latest else 1
        instance = serializer.save(
            content=content,
            uploaded_by=self.request.user,
            version_number=next_version,
        )
        if instance.file:
            instance.file_size = instance.file.size
            instance.save(update_fields=["file_size"])


# ─── Content Comments ───────────────────────────────────────────────────


class ContentCommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/content/{id}/comments/"""

    serializer_class = ContentCommentSerializer

    def get_queryset(self):
        return ContentComment.objects.filter(
            content_id=self.kwargs["pk"], parent__isnull=True,
        ).select_related("author").prefetch_related("replies")

    def perform_create(self, serializer):
        serializer.save(
            content_id=self.kwargs["pk"],
            author=self.request.user,
        )


class ContentCommentReplyListView(generics.ListAPIView):
    """GET /api/v1/content/comments/{id}/replies/"""

    serializer_class = ContentCommentSerializer

    def get_queryset(self):
        return ContentComment.objects.filter(
            parent_id=self.kwargs["pk"]
        ).select_related("author")


# ─── Global Search ──────────────────────────────────────────────────────


class GlobalSearchView(APIView):
    """GET /api/v1/content/search/?q={query}"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: inline_serializer("GlobalSearchResponse", {
            "status": serializers.CharField(),
            "data": inline_serializer("GlobalSearchData", {
                "courses": serializers.ListField(child=serializers.DictField()),
                "content": serializers.ListField(child=serializers.DictField()),
                "users": serializers.ListField(child=serializers.DictField()),
            }),
        })},
        tags=["Search"],
    )
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"status": "success", "data": {"courses": [], "content": [], "users": []}})

        user = request.user
        role = user.role
        
        # 1. Courses
        from apps.academics.models import CourseOffering
        course_qs = CourseOffering.objects.select_related("course", "semester")
        if role == "student":
            course_qs = course_qs.filter(enrollments__student=user)
        elif role in ["faculty", "head", "dean"]:
            course_qs = course_qs.filter(faculty=user)
        
        course_qs = course_qs.filter(
            Q(course__name__icontains=q) | 
            Q(course__code__icontains=q)
        ).distinct()[:5]

        courses_data = [
            {
                "id": str(c.id),
                "title": c.course.name,
                "subtitle": f"{c.course.code} · {c.semester.name}",
                "type": "course",
                "link": f"/{role}/courses/{c.id}" if role in ["admin", "faculty", "student"] else "#"
            } for c in course_qs
        ]

        # 2. Content
        content_qs = Content.objects.all()
        if role == "student":
            content_qs = content_qs.filter(
                Q(visibility="public") | 
                Q(course_offering__enrollments__student=user)
            )
        elif role != "admin":
            content_qs = content_qs.filter(
                Q(visibility="public") | 
                Q(uploaded_by=user) |
                Q(course_offering__faculty=user)
            )
        
        content_qs = content_qs.filter(
            Q(title__icontains=q) | Q(description__icontains=q)
        ).distinct()[:5]

        content_data = [
            {
                "id": str(c.id),
                "title": c.title,
                "subtitle": str(c.content_type).capitalize(),
                "type": "content",
                "link": f"/{role}/courses/{c.course_offering_id}" if c.course_offering_id else "#"
            } for c in content_qs
        ]

        # 3. Users
        from apps.accounts.models import User
        user_qs = User.objects.filter(is_active=True).filter(
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q) |
            Q(email__icontains=q)
        )[:5]

        users_data = [
            {
                "id": str(u.id),
                "title": f"{u.first_name} {u.last_name}",
                "subtitle": str(u.role).capitalize(),
                "type": "user",
                "link": "#"
            } for u in user_qs
        ]

        return Response({
            "status": "success",
            "data": {
                "courses": courses_data,
                "content": content_data,
                "users": users_data,
            }
        })
