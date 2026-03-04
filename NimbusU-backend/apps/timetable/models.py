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
    is_oneoff = models.BooleanField(
        default=False, 
        help_text="If True, this is a one-time makeup or extra session, not a regular weekly class."
    )
    oneoff_date = models.DateField(
        null=True, blank=True,
        help_text="Required if is_oneoff is True. The specific date of the session."
    )

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


class TimetableSwapRequest(models.Model):
    """Request from one faculty to swap a timetable slot with another faculty."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_swap_requests",
        help_text="Faculty who initiated the swap request",
    )
    target_faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_swap_requests",
        help_text="Faculty who must approve the swap",
    )
    requester_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.CASCADE,
        related_name="swap_requests_as_requester",
        help_text="Requester's timetable slot to swap",
    )
    target_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.CASCADE,
        related_name="swap_requests_as_target",
        help_text="Target faculty's timetable slot to swap",
    )
    message = models.TextField(
        blank=True, default="",
        help_text="Optional message explaining the swap reason",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "timetable_swap_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Swap: {self.requester} ↔ {self.target_faculty} "
            f"({self.get_status_display()})"
        )


class ClassCancellation(models.Model):
    """Faculty cancels or reschedules a specific class session."""

    class ActionType(models.TextChoices):
        CANCELLED = "cancelled", "Cancelled"
        RESCHEDULED = "rescheduled", "Rescheduled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.CASCADE,
        related_name="cancellations",
    )
    original_date = models.DateField(help_text="The date the class was supposed to occur")
    action = models.CharField(max_length=20, choices=ActionType.choices)
    reason = models.TextField(blank=True, default="")
    # Reschedule fields (only used when action='rescheduled')
    new_date = models.DateField(null=True, blank=True)
    new_start_time = models.TimeField(null=True, blank=True)
    new_end_time = models.TimeField(null=True, blank=True)
    new_location = models.CharField(max_length=200, blank=True, default="")
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="class_cancellations",
    )
    is_makeup = models.BooleanField(
        default=False,
        help_text="Does this cancellation have a linked makeup session?"
    )
    makeup_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="makeup_for_cancellation",
        help_text="The one-off TimetableEntry created as a makeup for this class."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "class_cancellations"
        ordering = ["-original_date"]
        unique_together = ["timetable_entry", "original_date"]

    def __str__(self):
        return f"{self.timetable_entry} on {self.original_date} → {self.get_action_display()}"


class RoomBooking(models.Model):
    """Booking a room for an extra session, club event, or seminar."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room, on_delete=models.CASCADE, related_name="bookings"
    )
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="room_bookings"
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    purpose = models.CharField(max_length=300)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="approved_room_bookings"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "room_bookings"
        ordering = ["-date", "-start_time"]
        unique_together = ["room", "date", "start_time"]

    def __str__(self):
        return f"{self.room} booked by {self.booked_by} on {self.date}"


class SubstituteFaculty(models.Model):
    """Tracking when a different faculty member covers a class."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable_entry = models.ForeignKey(
        TimetableEntry, on_delete=models.CASCADE, related_name="substitutes"
    )
    substitute = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="substitute_classes"
    )
    date = models.DateField()
    reason = models.TextField(blank=True, default="")
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assigned_substitutes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "substitute_faculty"
        ordering = ["-date"]
        unique_together = ["timetable_entry", "date"]

    def __str__(self):
        return f"{self.substitute} covering {self.timetable_entry} on {self.date}"

