"""Serializers for the timetable app."""

from rest_framework import serializers

from .models import (
    AttendanceRecord, Room, TimetableEntry, TimetableSwapRequest, 
    ClassCancellation, RoomBooking, SubstituteFaculty
)


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ["id", "name", "building", "capacity", "room_type", "is_available"]
        read_only_fields = ["id"]


class TimetableEntrySerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(
        source="course_offering.course.name", read_only=True
    )
    course_code = serializers.CharField(
        source="course_offering.course.code", read_only=True
    )
    faculty_name = serializers.CharField(
        source="course_offering.faculty.full_name", read_only=True
    )
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)
    subject_type_display = serializers.CharField(
        source="get_subject_type_display", read_only=True
    )
    semester_name = serializers.CharField(source="semester.name", read_only=True)
    department_name = serializers.CharField(
        source="course_offering.course.department.name", read_only=True, default=None
    )
    program_name = serializers.SerializerMethodField()

    class Meta:
        model = TimetableEntry
        fields = [
            "id", "course_offering", "course_name", "course_code",
            "faculty_name", "batch", "subject_type", "subject_type_display",
            "location", "day_of_week", "day_name", "start_time", "end_time",
            "semester", "semester_name", "department_name", "program_name",
            "is_active", "is_oneoff", "oneoff_date",
        ]
        read_only_fields = ["id"]

    def get_program_name(self, obj) -> str | None:
        department = obj.course_offering.course.department
        if department and department.programs.exists():
            return department.programs.first().name
        return None


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.full_name", read_only=True
    )

    class Meta:
        model = AttendanceRecord
        fields = [
            "id", "timetable_entry", "student", "student_name",
            "date", "status", "marked_by", "remarks", "created_at",
        ]
        read_only_fields = ["id", "created_at", "marked_by"]


class BulkAttendanceSerializer(serializers.Serializer):
    """Serializer for bulk attendance marking."""

    timetable_entry_id = serializers.UUIDField()
    date = serializers.DateField()
    records = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        help_text='List of {"student_id": "...", "status": "present|absent|late|excused"}',
    )


class TimetableSwapRequestSerializer(serializers.ModelSerializer):
    """Read serializer with nested display names."""

    requester_name = serializers.CharField(source="requester.full_name", read_only=True)
    target_faculty_name = serializers.CharField(source="target_faculty.full_name", read_only=True)
    requester_entry_detail = TimetableEntrySerializer(source="requester_entry", read_only=True)
    target_entry_detail = TimetableEntrySerializer(source="target_entry", read_only=True)

    class Meta:
        model = TimetableSwapRequest
        fields = [
            "id", "requester", "requester_name",
            "target_faculty", "target_faculty_name",
            "requester_entry", "requester_entry_detail",
            "target_entry", "target_entry_detail",
            "message", "status", "responded_at", "created_at",
        ]
        read_only_fields = ["id", "requester", "target_faculty", "status", "responded_at", "created_at"]


class TimetableSwapCreateSerializer(serializers.Serializer):
    """Write serializer — faculty picks their own entry + target entry."""

    requester_entry = serializers.UUIDField()
    target_entry = serializers.UUIDField()
    message = serializers.CharField(required=False, default="", allow_blank=True)


class ClassCancellationSerializer(serializers.ModelSerializer):
    """Read serializer for class cancellations."""

    course_name = serializers.CharField(
        source="timetable_entry.course_offering.course.name", read_only=True
    )
    faculty_name = serializers.CharField(
        source="cancelled_by.full_name", read_only=True
    )
    action_display = serializers.CharField(
        source="get_action_display", read_only=True
    )

    class Meta:
        model = ClassCancellation
        fields = [
            "id", "timetable_entry", "course_name", "original_date",
            "action", "action_display", "reason",
            "new_date", "new_start_time", "new_end_time", "new_location",
            "cancelled_by", "faculty_name", "is_makeup", "makeup_entry", 
            "created_at",
        ]
        read_only_fields = ["id", "cancelled_by", "created_at", "makeup_entry"]


class ClassCancellationCreateSerializer(serializers.Serializer):
    """Write serializer for cancelling or rescheduling a class."""

    timetable_entry = serializers.UUIDField()
    original_date = serializers.DateField()
    action = serializers.ChoiceField(choices=["cancelled", "rescheduled"])
    reason = serializers.CharField(required=False, default="", allow_blank=True)
    # Only for rescheduled
    new_date = serializers.DateField(required=False)
    new_start_time = serializers.TimeField(required=False)
    new_end_time = serializers.TimeField(required=False)
    new_location = serializers.CharField(required=False, default="", allow_blank=True)
    is_makeup = serializers.BooleanField(required=False, default=False)


class RoomBookingSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source="room.name", read_only=True)
    building = serializers.CharField(source="room.building", read_only=True)
    booked_by_name = serializers.CharField(source="booked_by.full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True)

    class Meta:
        model = RoomBooking
        fields = [
            "id", "room", "room_name", "building", "booked_by", "booked_by_name",
            "date", "start_time", "end_time", "purpose", "status",
            "approved_by", "approved_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "booked_by", "created_at", "updated_at", "approved_by", "status"]


class SubstituteFacultySerializer(serializers.ModelSerializer):
    substitute_name = serializers.CharField(source="substitute.full_name", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.full_name", read_only=True)
    timetable_entry_detail = TimetableEntrySerializer(source="timetable_entry", read_only=True)

    class Meta:
        model = SubstituteFaculty
        fields = [
            "id", "timetable_entry", "timetable_entry_detail",
            "substitute", "substitute_name", "date", "reason",
            "assigned_by", "assigned_by_name", "created_at",
        ]
        read_only_fields = ["id", "assigned_by", "created_at"]
