import uuid

from django.conf import settings
from django.db import models


class Room(models.Model):
    """Physical room / lab / auditorium."""

    class RoomType(models.TextChoices):
        CLASSROOM = "classroom", "Classroom"
        LAB = "lab", "Laboratory"
        AUDITORIUM = "auditorium", "Auditorium"
        CONFERENCE = "conference", "Conference Room"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    building = models.CharField(max_length=100, null=True, blank=True)
    capacity = models.IntegerField()
    room_type = models.CharField(
        max_length=30, choices=RoomType.choices, default=RoomType.CLASSROOM
    )
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "rooms"
        ordering = ["building", "name"]

    def __str__(self):
        return f"{self.building} - {self.name}" if self.building else self.name


class TimetableEntry(models.Model):
    """A single timetable slot — batch-based."""

    class SubjectType(models.TextChoices):
        CLASSROOM = "classroom", "Classroom"
        LAB = "lab", "Laboratory"
        TUTORIAL = "tutorial", "Tutorial"

    DAY_CHOICES = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course_offering = models.ForeignKey(
        "academics.CourseOffering",
        on_delete=models.CASCADE,
        related_name="timetable_entries",
    )
    batch = models.CharField(max_length=50, default="", help_text="e.g. A1, B2, CS-2024")
    subject_type = models.CharField(
        max_length=20,
        choices=SubjectType.choices,
        default=SubjectType.CLASSROOM,
    )
    location = models.CharField(
        max_length=200,
        default="",
        help_text="Free-text room/lab, e.g. 'Floor 1 Room 150', 'Lab B1'",
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    semester = models.ForeignKey(
        "academics.Semester",
        on_delete=models.CASCADE,
        related_name="timetable_entries",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "timetable_entries"
        ordering = ["day_of_week", "start_time"]

    def __str__(self):
        day_name = dict(self.DAY_CHOICES).get(self.day_of_week, "")
        return (
            f"{self.course_offering} - {day_name} "
            f"{self.start_time}-{self.end_time} ({self.batch})"
        )


class AttendanceRecord(models.Model):
    """Attendance record for a student in a timetable slot on a given date."""

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        EXCUSED = "excused", "Excused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="marked_attendances",
    )
    remarks = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_records"
        unique_together = ["timetable_entry", "student", "date"]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.student} - {self.date} - {self.status}"
