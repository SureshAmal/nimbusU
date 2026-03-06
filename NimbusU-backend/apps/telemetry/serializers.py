"""Serializers for the telemetry app."""

from rest_framework import serializers
from .models import SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Serializer for global Site Settings."""

    class Meta:
        model = SiteSettings
        fields = [
            "institution_name",
            "support_email",
            "academic_year",
            "enable_student_registration",
            "enable_file_uploads",
            "enable_forum_discussions",
        ]
