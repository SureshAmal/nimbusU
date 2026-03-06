"""Models for the telemetry app."""

import uuid

from django.conf import settings
from django.db import models


class RequestLog(models.Model):
    """Captures every API request for telemetry and analytics."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    status_code = models.SmallIntegerField()
    response_time_ms = models.FloatField(help_text="Response time in milliseconds")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="request_logs",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "request_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at", "path"], name="idx_reqlog_created_path"),
            models.Index(fields=["status_code"], name="idx_reqlog_status"),
        ]

    def __str__(self):
        return f"{self.method} {self.path} → {self.status_code} ({self.response_time_ms:.0f}ms)"


class SiteSettings(models.Model):
    """Global institution settings (Singleton)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution_name = models.CharField(max_length=255, default="NimbusU University")
    support_email = models.EmailField(default="support@nimbusu.edu")
    academic_year = models.CharField(max_length=20, default="2024-2025")
    enable_student_registration = models.BooleanField(default=False)
    enable_file_uploads = models.BooleanField(default=True)
    enable_forum_discussions = models.BooleanField(default=True)

    class Meta:
        db_table = "site_settings"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return self.institution_name

    def save(self, *args, **kwargs):
        """Ensure only one instance exists."""
        self.pk = self.id if self.id else self.pk
        if SiteSettings.objects.exists() and not self.pk:
            return SiteSettings.objects.first()
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """Load the singleton instance."""
        obj, _ = cls.objects.get_or_create()
        return obj
