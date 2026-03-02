"""Admin registrations for the accounts app."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AuditLog, FacultyProfile, StudentProfile, User


class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False
    extra = 0


class FacultyProfileInline(admin.StackedInline):
    model = FacultyProfile
    can_delete = False
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "first_name", "last_name", "role", "is_active", "created_at"]
    list_filter = ["role", "is_active", "department"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["-created_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "phone", "profile_picture")}),
        ("Role & Department", {"fields": ("role", "department")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Security", {"fields": ("failed_login_attempts", "locked_until")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "role", "password1", "password2"),
        }),
    )

    inlines = [StudentProfileInline, FacultyProfileInline]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["user", "action", "entity_type", "created_at"]
    list_filter = ["action", "entity_type"]
    search_fields = ["user__email", "action"]
    readonly_fields = ["user", "action", "entity_type", "entity_id", "details", "ip_address", "created_at"]
