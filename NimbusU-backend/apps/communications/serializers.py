"""Serializers for the communications app."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import (
    Announcement,
    DiscussionForum,
    DiscussionPost,
    Message,
    Notification,
    NotificationPreference,
    WebhookEndpoint,
    WebhookDelivery,
)


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "body", "created_by", "created_by_name",
            "target_type", "target_id", "is_urgent",
            "publish_at", "expires_at", "is_published", "created_at",
        ]
        read_only_fields = ["id", "created_at", "created_by"]


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    receiver_name = serializers.CharField(source="receiver.full_name", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id", "sender", "sender_name", "receiver", "receiver_name",
            "subject", "body", "is_read", "read_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "sender", "is_read", "read_at"]


class DiscussionPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = DiscussionPost
        fields = [
            "id", "forum", "author", "author_name",
            "parent", "body", "replies", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "author"]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_replies(self, obj) -> list:
        if obj.parent is None:
            replies = obj.replies.select_related("author").all()[:10]
            return DiscussionPostSerializer(replies, many=True).data
        return []


class DiscussionForumSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = DiscussionForum
        fields = [
            "id", "title", "course_offering", "created_by",
            "created_by_name", "is_active", "post_count", "created_at",
        ]
        read_only_fields = ["id", "created_at", "created_by"]

    @extend_schema_field(serializers.IntegerField)
    def get_post_count(self, obj) -> int:
        return obj.posts.count()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "user", "title", "message", "notification_type",
            "reference_type", "reference_id", "channel",
            "is_read", "read_at", "status", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "id", "user", "notification_type",
            "email_enabled", "push_enabled", "in_app_enabled",
        ]
        read_only_fields = ["id", "user"]


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = [
            "id", "name", "url", "secret", "events",
            "owner", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]
        extra_kwargs = {"secret": {"write_only": True}}


class WebhookDeliverySerializer(serializers.ModelSerializer):
    endpoint_name = serializers.CharField(source="endpoint.name", read_only=True)

    class Meta:
        model = WebhookDelivery
        fields = [
            "id", "endpoint", "endpoint_name", "event_type", "payload",
            "status", "response_status_code", "response_body",
            "attempts", "delivered_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
