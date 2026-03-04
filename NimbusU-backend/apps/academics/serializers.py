"""Serializers for the academics app."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import AcademicEvent, Course, CourseOffering, Department, Enrollment, Program, School, Semester


class SchoolSerializer(serializers.ModelSerializer):
    dean_name = serializers.CharField(source="dean.full_name", read_only=True, default=None)

    class Meta:
        model = School
        fields = ["id", "name", "code", "dean", "dean_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(source="head.full_name", read_only=True, default=None)
    school_name = serializers.CharField(source="school.name", read_only=True, default=None)

    class Meta:
        model = Department
        fields = ["id", "name", "code", "school", "school_name", "head", "head_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Program
        fields = [
            "id", "name", "code", "department", "department_name",
            "duration_years", "degree_type", "is_active",
        ]
        read_only_fields = ["id"]


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ["id", "name", "academic_year", "start_date", "end_date", "is_current"]
        read_only_fields = ["id"]


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id", "name", "code", "department", "department_name",
            "credits", "description", "is_active",
        ]
        read_only_fields = ["id"]


class CourseOfferingSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    semester_name = serializers.CharField(source="semester.name", read_only=True)
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseOffering
        fields = [
            "id", "course", "course_name", "course_code",
            "semester", "semester_name", "faculty", "faculty_name",
            "section", "max_students", "enrolled_count",
        ]
        read_only_fields = ["id"]

    @extend_schema_field(serializers.IntegerField)
    def get_enrolled_count(self, obj) -> int:
        return obj.enrollments.filter(status="active").count()


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    course_name = serializers.CharField(source="course_offering.course.name", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id", "student", "student_name",
            "course_offering", "course_name",
            "enrolled_at", "status",
        ]
        read_only_fields = ["id", "enrolled_at"]


class AcademicEventSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source="semester.name", read_only=True, default=None)
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default=None)
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model = AcademicEvent
        fields = [
            "id", "title", "description", "event_type", "event_type_display",
            "start_date", "end_date", "semester", "semester_name",
            "is_university_wide", "department", "department_name",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]
