"""Serializers for the timetable app."""

from rest_framework import serializers

from .models import AttendanceRecord, Room, TimetableEntry


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

    class Meta:
        model = TimetableEntry
        fields = [
            "id", "course_offering", "course_name", "course_code",
            "faculty_name", "batch", "subject_type", "subject_type_display",
            "location", "day_of_week", "day_name", "start_time", "end_time",
            "semester", "is_active",
        ]
        read_only_fields = ["id"]


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
