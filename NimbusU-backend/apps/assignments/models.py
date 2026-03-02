import uuid

from django.conf import settings
from django.db import models


class Assignment(models.Model):
    """Faculty-created assignment / quiz / exam."""

    class AssignmentType(models.TextChoices):
        ASSIGNMENT = "assignment", "Assignment"
        QUIZ = "quiz", "Quiz"
        EXAM = "exam", "Exam"
        PROJECT = "project", "Project"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField(null=True, blank=True)
    course_offering = models.ForeignKey(
        "academics.CourseOffering",
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_assignments",
    )
    due_date = models.DateTimeField()
    max_marks = models.DecimalField(max_digits=6, decimal_places=2)
    assignment_type = models.CharField(
        max_length=30,
        choices=AssignmentType.choices,
        default=AssignmentType.ASSIGNMENT,
    )
    attachments = models.JSONField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assignments"
        ordering = ["-due_date"]

    def __str__(self):
        return f"{self.title} ({self.course_offering})"


class Submission(models.Model):
    """Student submission for an assignment."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        GRADED = "graded", "Graded"
        RETURNED = "returned", "Returned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name="submissions"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    file = models.FileField(
        upload_to="submissions/%Y/%m/", null=True, blank=True
    )
    text_content = models.TextField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    marks_obtained = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    grade = models.CharField(max_length=5, null=True, blank=True)
    feedback = models.TextField(null=True, blank=True)
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="graded_submissions",
    )
    graded_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUBMITTED
    )

    class Meta:
        db_table = "submissions"
        unique_together = ["assignment", "student"]
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student} → {self.assignment}"
