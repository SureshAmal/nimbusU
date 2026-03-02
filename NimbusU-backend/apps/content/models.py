import uuid

from django.conf import settings
from django.db import models


class ContentFolder(models.Model):
    """Hierarchical folder structure for organizing content."""

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        DEPARTMENT = "department", "Department"
        COURSE = "course", "Course"
        PRIVATE = "private", "Private"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_folders",
    )
    course_offering = models.ForeignKey(
        "academics.CourseOffering",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="folders",
    )
    visibility = models.CharField(
        max_length=20, choices=Visibility.choices, default=Visibility.COURSE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "content_folders"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ContentTag(models.Model):
    """Tag/keyword for content searchability."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "content_tags"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Content(models.Model):
    """A piece of content (document, video, image, link, etc.)."""

    class ContentType(models.TextChoices):
        DOCUMENT = "document", "Document"
        VIDEO = "video", "Video"
        IMAGE = "image", "Image"
        LINK = "link", "Link"
        ASSIGNMENT = "assignment", "Assignment"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        DEPARTMENT = "department", "Department"
        COURSE = "course", "Course"
        PRIVATE = "private", "Private"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField(null=True, blank=True)
    content_type = models.CharField(max_length=30, choices=ContentType.choices)
    file = models.FileField(upload_to="content/%Y/%m/", null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, null=True, blank=True)
    external_url = models.URLField(max_length=500, null=True, blank=True)
    folder = models.ForeignKey(
        ContentFolder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contents",
    )
    course_offering = models.ForeignKey(
        "academics.CourseOffering",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="contents",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="uploaded_contents",
    )
    visibility = models.CharField(
        max_length=20, choices=Visibility.choices, default=Visibility.COURSE
    )
    tags = models.ManyToManyField(ContentTag, blank=True, related_name="contents")
    publish_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contents"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ContentAccessLog(models.Model):
    """Tracks who viewed/downloaded content and when."""

    class Action(models.TextChoices):
        VIEWED = "viewed", "Viewed"
        DOWNLOADED = "downloaded", "Downloaded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.ForeignKey(
        Content, on_delete=models.CASCADE, related_name="access_logs"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="content_access_logs",
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    duration_seconds = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "content_access_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} {self.action} {self.content}"


class Bookmark(models.Model):
    """User bookmarks for quick access to content."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    content = models.ForeignKey(
        Content, on_delete=models.CASCADE, related_name="bookmarks"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bookmarks"
        unique_together = ["user", "content"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.content}"
