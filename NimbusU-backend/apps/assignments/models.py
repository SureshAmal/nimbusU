import uuid

from django.conf import settings
from django.db import models

from apps.common.models import SoftDeleteModel


class Assignment(SoftDeleteModel):
    """Faculty-created assignment / quiz / exam."""

    class AssignmentType(models.TextChoices):
        ASSIGNMENT = "assignment", "Assignment"
        QUIZ = "quiz", "Quiz"
        EXAM = "exam", "Exam"
        PROJECT = "project", "Project"

    class LatePolicy(models.TextChoices):
        NONE = "none", "No Penalty"
        PERCENTAGE_PER_DAY = "percentage_per_day", "% Deduction Per Day"
        FLAT_DEDUCTION = "flat_deduction", "Flat Mark Deduction"
        NO_ACCEPT = "no_accept", "Do Not Accept Late"

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
    # Late submission policy
    late_policy = models.CharField(
        max_length=30,
        choices=LatePolicy.choices,
        default=LatePolicy.NONE,
    )
    late_penalty_value = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="% per day or flat marks to deduct",
    )
    max_late_days = models.IntegerField(
        default=0, help_text="Maximum days late allowed (0 = unlimited)",
    )
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
    # Resubmission tracking
    version = models.PositiveIntegerField(default=1)
    is_final = models.BooleanField(
        default=True, help_text="Is this the final submission to be graded?"
    )

    class Meta:
        db_table = "submissions"
        # Removed: unique_together = ["assignment", "student"]
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student} → {self.assignment} (v{self.version})"



class GradingRubric(models.Model):
    """A standardized grading rubric for an assignment."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.OneToOneField(
        Assignment, on_delete=models.CASCADE, related_name="rubric"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_rubrics"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "grading_rubrics"

    def __str__(self):
        return f"Rubric for {self.assignment.title}"


class RubricCriteria(models.Model):
    """Individual criterion in a grading rubric (e.g., 'Code Quality')."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rubric = models.ForeignKey(
        GradingRubric, on_delete=models.CASCADE, related_name="criteria"
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    max_marks = models.DecimalField(max_digits=5, decimal_places=2)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "rubric_criteria"
        ordering = ["order", "name"]
        unique_together = ["rubric", "name"]

    def __str__(self):
        return f"{self.name} ({self.max_marks} marks) - Rubric {self.rubric.id}"


class AssignmentGroup(models.Model):
    """Team grouping for group assignments/projects."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name="groups"
    )
    name = models.CharField(max_length=200)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="assignment_groups"
    )
    submission = models.ForeignKey(
        Submission, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="group"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assignment_groups"
        ordering = ["name"]
        unique_together = ["assignment", "name"]

    def __str__(self):
        return f"{self.name} ({self.assignment.title})"
