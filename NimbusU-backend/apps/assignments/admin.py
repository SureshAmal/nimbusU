"""Admin registrations for the assignments app."""

from django.contrib import admin

from .models import Assignment, Submission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ["title", "course_offering", "assignment_type", "due_date", "is_published"]
    list_filter = ["assignment_type", "is_published"]
    search_fields = ["title"]


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ["student", "assignment", "status", "marks_obtained", "submitted_at"]
    list_filter = ["status"]
