"""Admin registrations for the timetable app."""

from django.contrib import admin

from .models import AttendanceRecord, Room, TimetableEntry


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "building", "capacity", "room_type", "is_available"]
    list_filter = ["room_type", "is_available"]


@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = ["course_offering", "batch", "subject_type", "location", "day_of_week", "start_time", "end_time", "is_active"]
    list_filter = ["day_of_week", "subject_type", "batch", "is_active"]


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ["student", "timetable_entry", "date", "status", "marked_by"]
    list_filter = ["status", "date"]
