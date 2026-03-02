"""Admin registrations for the communications app."""

from django.contrib import admin

from .models import (
    Announcement,
    DiscussionForum,
    DiscussionPost,
    Message,
    Notification,
    NotificationPreference,
)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "created_by", "target_type", "is_urgent", "is_published", "created_at"]
    list_filter = ["target_type", "is_urgent", "is_published"]
    search_fields = ["title"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["sender", "receiver", "subject", "is_read", "created_at"]
    list_filter = ["is_read"]


@admin.register(DiscussionForum)
class DiscussionForumAdmin(admin.ModelAdmin):
    list_display = ["title", "course_offering", "created_by", "is_active", "created_at"]
    list_filter = ["is_active"]


@admin.register(DiscussionPost)
class DiscussionPostAdmin(admin.ModelAdmin):
    list_display = ["forum", "author", "parent", "created_at"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "notification_type", "channel", "status", "is_read", "created_at"]
    list_filter = ["notification_type", "channel", "status", "is_read"]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ["user", "notification_type", "email_enabled", "push_enabled", "in_app_enabled"]
