"""Admin registrations for the academics app."""

from django.contrib import admin

from .models import Course, CourseOffering, Department, Enrollment, Program, Semester


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "head", "created_at"]
    search_fields = ["name", "code"]


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "department", "degree_type", "is_active"]
    list_filter = ["department", "degree_type", "is_active"]


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ["name", "academic_year", "start_date", "end_date", "is_current"]
    list_filter = ["is_current"]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "department", "credits", "is_active"]
    list_filter = ["department", "is_active"]
    search_fields = ["name", "code"]


@admin.register(CourseOffering)
class CourseOfferingAdmin(admin.ModelAdmin):
    list_display = ["course", "semester", "faculty", "section", "max_students"]
    list_filter = ["semester", "course__department"]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["student", "course_offering", "status", "enrolled_at"]
    list_filter = ["status"]
