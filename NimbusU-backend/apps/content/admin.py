"""Admin registrations for the content app."""

from django.contrib import admin

from .models import Bookmark, Content, ContentAccessLog, ContentFolder, ContentTag


@admin.register(ContentFolder)
class ContentFolderAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "created_by", "visibility", "created_at"]
    list_filter = ["visibility"]


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ["title", "content_type", "uploaded_by", "visibility", "is_published", "created_at"]
    list_filter = ["content_type", "visibility", "is_published"]
    search_fields = ["title"]


@admin.register(ContentTag)
class ContentTagAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]


@admin.register(ContentAccessLog)
class ContentAccessLogAdmin(admin.ModelAdmin):
    list_display = ["content", "user", "action", "created_at"]
    list_filter = ["action"]


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ["user", "content", "created_at"]
