"""Views for the accounts app."""

from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status, filters
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog
from .permissions import IsAdmin
from .serializers import (
    AuditLogSerializer,
    AvatarUploadSerializer,
    ChangePasswordSerializer,
    LogoutSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
)

User = get_user_model()


# ─── Auth ───────────────────────────────────────────────────────────────


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Self-registration."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "status": "success",
                "data": {
                    "user": UserDetailSerializer(user).data,
                    "tokens": {
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklist the refresh token."""

    @extend_schema(
        request=LogoutSerializer,
        responses={200: inline_serializer("LogoutResponse", {"status": serializers.CharField(), "message": serializers.CharField()})},
        tags=["Auth"],
    )
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"status": "success", "message": "Logged out."},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {"status": "error", "message": "Invalid token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ChangePasswordView(APIView):
    """POST /api/v1/auth/password/change/"""

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: inline_serializer("ChangePasswordResponse", {"status": serializers.CharField(), "message": serializers.CharField()})},
        tags=["Auth"],
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response(
            {"status": "success", "message": "Password changed."},
            status=status.HTTP_200_OK,
        )


# ─── User Management ───────────────────────────────────────────────────


class UserListCreateView(generics.ListCreateAPIView):
    """GET /api/v1/users/ — List users (admin).
    POST /api/v1/users/ — Create user (admin)."""

    queryset = User.objects.select_related("department").all()
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["role", "department", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["created_at", "email", "first_name"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserListSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/users/{id}/"""

    queryset = User.objects.select_related("department").all()
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/users/me/ — Current user profile."""

    serializer_class = UserDetailSerializer

    def get_object(self):
        return self.request.user


class AvatarUploadView(APIView):
    """POST /api/v1/users/me/avatar/"""

    parser_classes = [MultiPartParser]

    @extend_schema(
        request=AvatarUploadSerializer,
        responses={200: inline_serializer("AvatarResponse", {"status": serializers.CharField(), "data": serializers.DictField()})},
        tags=["Users"],
    )
    def post(self, request):
        user = request.user
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response(
                {"status": "error", "message": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.profile_picture = avatar
        user.save()
        return Response(
            {
                "status": "success",
                "data": {"profile_picture": user.profile_picture.url},
            },
            status=status.HTTP_200_OK,
        )


class UserResetPasswordView(APIView):
    """POST /api/v1/users/{id}/reset-password/ — Admin resets a user's password."""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @extend_schema(
        request=ResetPasswordSerializer,
        responses={200: inline_serializer("ResetPasswordResponse", {"status": serializers.CharField(), "message": serializers.CharField()})},
        tags=["Users"],
    )
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"status": "error", "message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        new_password = request.data.get("new_password")
        if not new_password or len(new_password) < 8:
            return Response(
                {"status": "error", "message": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save()
        return Response(
            {"status": "success", "message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )


class AuditLogListView(generics.ListAPIView):
    """GET /api/v1/admin/audit-logs/"""

    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["user", "action", "entity_type"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        from_date = self.request.query_params.get("from")
        to_date = self.request.query_params.get("to")
        if from_date:
            qs = qs.filter(created_at__gte=from_date)
        if to_date:
            qs = qs.filter(created_at__lte=to_date)
        return qs
