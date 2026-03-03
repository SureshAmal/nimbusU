import uuid

from django.conf import settings
from django.db import models


class School(models.Model):
    """Academic school or faculty (e.g. Faculty of Engineering and Technology)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)
    dean = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_schools",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "schools"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Department(models.Model):
    """Academic department."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="departments"
    )
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "departments"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Program(models.Model):
    """Academic program (e.g. B.Tech Computer Science)."""

    class DegreeType(models.TextChoices):
        UG = "UG", "Undergraduate"
        PG = "PG", "Postgraduate"
        PHD = "PhD", "Doctorate"
        DIPLOMA = "Diploma", "Diploma"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="programs"
    )
    duration_years = models.IntegerField()
    degree_type = models.CharField(max_length=50, choices=DegreeType.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "programs"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Semester(models.Model):
    """Academic semester / term."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    academic_year = models.CharField(max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        db_table = "semesters"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} ({self.academic_year})"


class Course(models.Model):
    """A course offered by a department."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="courses"
    )
    credits = models.IntegerField()
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "courses"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class CourseOffering(models.Model):
    """An instance of a course in a specific semester, taught by a faculty member."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="offerings"
    )
    semester = models.ForeignKey(
        Semester, on_delete=models.CASCADE, related_name="offerings"
    )
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teaching_offerings",
    )
    section = models.CharField(max_length=10, default="A")
    max_students = models.IntegerField(default=60)

    class Meta:
        db_table = "course_offerings"
        unique_together = ["course", "semester", "section"]
        ordering = ["-semester__start_date", "course__code"]

    def __str__(self):
        return f"{self.course.code} - {self.section} ({self.semester.name})"


class Enrollment(models.Model):
    """Student enrollment in a course offering."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DROPPED = "dropped", "Dropped"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course_offering = models.ForeignKey(
        CourseOffering, on_delete=models.CASCADE, related_name="enrollments"
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )

    class Meta:
        db_table = "enrollments"
        unique_together = ["student", "course_offering"]

    def __str__(self):
        return f"{self.student} → {self.course_offering}"
