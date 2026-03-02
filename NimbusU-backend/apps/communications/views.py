"""Views for the communications app."""

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsAdminOrFaculty, IsOwnerOrAdmin

from .models import (
    Announcement,
    DiscussionForum,
    DiscussionPost,
    Message,
    Notification,
    NotificationPreference,
)
from .serializers import (
    AnnouncementSerializer,
    DiscussionForumSerializer,
    DiscussionPostSerializer,
    MessageSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
)


# ─── Announcements ─────────────────────────────────────────────────────


class AnnouncementListCreateView(generics.ListCreateAPIView):
    serializer_class = AnnouncementSerializer
    filterset_fields = ["target_type", "is_urgent", "is_published"]
    search_fields = ["title", "body"]

    def get_queryset(self):
        return Announcement.objects.select_related("created_by").all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return Announcement.objects.select_related("created_by").all()


# ─── Messages ───────────────────────────────────────────────────────────


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Message.objects.none()
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).select_related("sender", "receiver")

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class MessageDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Message.objects.none()
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.receiver == request.user and not instance.is_read:
            instance.is_read = True
            instance.read_at = timezone.now()
            instance.save(update_fields=["is_read", "read_at"])
        return Response(
            {"status": "success", "data": MessageSerializer(instance).data}
        )


# ─── Discussion Forums ─────────────────────────────────────────────────


class ForumListCreateView(generics.ListCreateAPIView):
    serializer_class = DiscussionForumSerializer
    filterset_fields = ["course_offering", "is_active"]

    def get_queryset(self):
        return DiscussionForum.objects.select_related("created_by").all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ForumDetailView(APIView):
    """GET /api/v1/communications/forums/{id}/ — includes top-level posts."""

    @extend_schema(
        responses={200: inline_serializer("ForumDetailResponse", {
            "status": serializers.CharField(),
            "data": serializers.DictField(),
        })},
        tags=["Forums"],
    )
    def get(self, request, pk):
        try:
            forum = DiscussionForum.objects.select_related("created_by").get(pk=pk)
        except DiscussionForum.DoesNotExist:
            return Response(
                {"status": "error", "message": "Forum not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        posts = (
            forum.posts.filter(parent__isnull=True)
            .select_related("author")
            .order_by("-created_at")[:50]
        )
        return Response({
            "status": "success",
            "data": {
                "forum": DiscussionForumSerializer(forum).data,
                "posts": DiscussionPostSerializer(posts, many=True).data,
            },
        })


class ForumPostCreateView(generics.CreateAPIView):
    """POST /api/v1/communications/forums/{id}/posts/"""

    serializer_class = DiscussionPostSerializer

    def perform_create(self, serializer):
        serializer.save(
            author=self.request.user,
            forum_id=self.kwargs["pk"],
        )


class ForumPostEditView(generics.UpdateAPIView):
    serializer_class = DiscussionPostSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return DiscussionPost.objects.none()
        return DiscussionPost.objects.filter(author=self.request.user)


class ForumPostDeleteView(generics.DestroyAPIView):
    serializer_class = DiscussionPostSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return DiscussionPost.objects.none()
        user = self.request.user
        if user.role == "admin":
            return DiscussionPost.objects.all()
        return DiscussionPost.objects.filter(author=user)


# ─── Notifications ──────────────────────────────────────────────────────


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)


class NotificationMarkReadView(APIView):
    """PATCH /api/v1/notifications/{id}/read/"""

    @extend_schema(
        request=None,
        responses={200: inline_serializer("MarkReadResponse", {"status": serializers.CharField(), "message": serializers.CharField()})},
        tags=["Notifications"],
    )
    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"status": "error", "message": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save(update_fields=["is_read", "read_at"])
        return Response({"status": "success", "message": "Marked as read."})


class NotificationReadAllView(APIView):
    """POST /api/v1/notifications/read-all/"""

    @extend_schema(
        request=None,
        responses={200: inline_serializer("ReadAllResponse", {"status": serializers.CharField(), "message": serializers.CharField()})},
        tags=["Notifications"],
    )
    def post(self, request):
        count = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response(
            {"status": "success", "message": f"{count} notifications marked as read."}
        )


class UnreadCountView(APIView):
    """GET /api/v1/notifications/unread-count/"""

    @extend_schema(
        responses={200: inline_serializer("UnreadCountResponse", {
            "status": serializers.CharField(),
            "data": inline_serializer("UnreadCountData", {"unread_count": serializers.IntegerField()}),
        })},
        tags=["Notifications"],
    )
    def get(self, request):
        count = Notification.objects.filter(
            user=request.user, is_read=False
        ).count()
        return Response({"status": "success", "data": {"unread_count": count}})


class NotificationPreferencesView(generics.ListCreateAPIView):
    serializer_class = NotificationPreferenceSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return NotificationPreference.objects.none()
        return NotificationPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NotificationPreferenceUpdateView(generics.UpdateAPIView):
    serializer_class = NotificationPreferenceSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return NotificationPreference.objects.none()
        return NotificationPreference.objects.filter(user=self.request.user)


# ─── Admin Notification Stats ──────────────────────────────────────────


class NotificationAdminStatsView(APIView):
    """GET /api/v1/notifications/admin/stats/"""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @extend_schema(
        responses={200: inline_serializer("NotificationStatsResponse", {
            "status": serializers.CharField(),
            "data": inline_serializer("NotificationStatsData", {
                "total": serializers.IntegerField(),
                "today": serializers.IntegerField(),
                "this_week": serializers.IntegerField(),
                "this_month": serializers.IntegerField(),
                "by_status": serializers.DictField(),
                "delivery_rate": serializers.FloatField(),
            }),
        })},
        tags=["Admin"],
    )
    def get(self, request):
        now = timezone.now()
        stats = {
            "total": Notification.objects.count(),
            "today": Notification.objects.filter(
                created_at__date=now.date()
            ).count(),
            "this_week": Notification.objects.filter(
                created_at__gte=now - timedelta(days=7)
            ).count(),
            "this_month": Notification.objects.filter(
                created_at__gte=now - timedelta(days=30)
            ).count(),
            "by_status": dict(
                Notification.objects.values_list("status")
                .annotate(count=Count("id"))
                .values_list("status", "count")
            ),
            "delivery_rate": self._delivery_rate(),
        }
        return Response({"status": "success", "data": stats})

    def _delivery_rate(self):
        total = Notification.objects.count()
        if total == 0:
            return 0
        delivered = Notification.objects.filter(
            status__in=["sent", "delivered"]
        ).count()
        return round(delivered / total * 100, 1)
