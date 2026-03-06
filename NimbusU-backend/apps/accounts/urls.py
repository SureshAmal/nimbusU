"""URL routing for the accounts app."""

from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from . import views

app_name = "accounts"

urlpatterns = [
    # Auth
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/password/change/", views.ChangePasswordView.as_view(), name="change-password"),
    path("users/", views.UserListCreateView.as_view(), name="user-list-create"),
    path("users/bulk-create/", views.UserBulkCreateView.as_view(), name="user-bulk-create"),
    path("users/me/", views.MeView.as_view(), name="me"),
    path("users/me/preferences/", views.UserPreferencesUpdateView.as_view(), name="me-preferences"),
    path("users/me/avatar/", views.AvatarUploadView.as_view(), name="avatar-upload"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("users/<uuid:pk>/reset-password/", views.UserResetPasswordView.as_view(), name="user-reset-password"),
    # Audit logs
    path("admin/audit-logs/", views.AuditLogListView.as_view(), name="audit-log-list"),
    # Dashboard stats
    path("admin/dashboard-stats/", views.AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
]
