"""Serializers for the content app."""

from rest_framework import serializers

from .models import Bookmark, Content, ContentAccessLog, ContentFolder, ContentTag


class ContentTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentTag
        fields = ["id", "name"]
        read_only_fields = ["id"]


class ContentFolderSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )

    class Meta:
        model = ContentFolder
        fields = [
            "id", "name", "parent", "created_by", "created_by_name",
            "course_offering", "visibility", "created_at",
        ]
        read_only_fields = ["id", "created_at", "created_by"]


class ContentListSerializer(serializers.ModelSerializer):
    """Lightweight content serializer for listings."""

    uploaded_by_name = serializers.CharField(
        source="uploaded_by.full_name", read_only=True
    )
    tags = ContentTagSerializer(many=True, read_only=True)

    class Meta:
        model = Content
        fields = [
            "id", "title", "content_type", "file_size", "mime_type",
            "uploaded_by", "uploaded_by_name", "course_offering",
            "visibility", "is_published", "tags", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ContentDetailSerializer(serializers.ModelSerializer):
    """Full content serializer."""

    uploaded_by_name = serializers.CharField(
        source="uploaded_by.full_name", read_only=True
    )
    tags = ContentTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=ContentTag.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="tags",
    )

    class Meta:
        model = Content
        fields = [
            "id", "title", "description", "content_type",
            "file", "file_size", "mime_type", "external_url",
            "folder", "course_offering", "uploaded_by", "uploaded_by_name",
            "visibility", "tags", "tag_ids", "publish_at", "expires_at",
            "is_published", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "uploaded_by"]


class ContentAccessLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ContentAccessLog
        fields = ["id", "content", "user", "user_name", "action", "duration_seconds", "created_at"]
        read_only_fields = ["id", "created_at"]


class BookmarkSerializer(serializers.ModelSerializer):
    content_title = serializers.CharField(source="content.title", read_only=True)
    content_type = serializers.CharField(source="content.content_type", read_only=True)

    class Meta:
        model = Bookmark
        fields = ["id", "user", "content", "content_title", "content_type", "created_at"]
        read_only_fields = ["id", "created_at", "user"]
