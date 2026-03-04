"""Serializers for the academics app."""

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

User = get_user_model()

from .models import (
    AcademicEvent, Course, CourseOffering, CoursePrerequisite,
    Department, Enrollment, Grade, Program, School, Semester,
)


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
            "duration_years", "degree_type", "credit_limit", "is_active",
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


class EnrollmentBulkCreateSerializer(serializers.Serializer):
    """Serializer for bulk creating enrollments from a JSON array."""
    
    course_offering = serializers.PrimaryKeyRelatedField(queryset=CourseOffering.objects.all())
    students = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="student"), many=True)

    def create(self, validated_data):
        course_offering = validated_data["course_offering"]
        students = validated_data["students"]
        
        enrollments = []
        for student in students:
            # Check if already enrolled to avoid integrity errors or duplicates
            if not Enrollment.objects.filter(student=student, course_offering=course_offering).exists():
                enrollments.append(
                    Enrollment(student=student, course_offering=course_offering)
                )
                
        # Bulk create for efficiency
        if enrollments:
            Enrollment.objects.bulk_create(enrollments)
            
        return enrollments


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


class CoursePrerequisiteSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    required_course_name = serializers.CharField(source="required_course.name", read_only=True)
    required_course_code = serializers.CharField(source="required_course.code", read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = CoursePrerequisite
        fields = [
            "id", "course", "course_name", "course_code",
            "required_course", "required_course_name", "required_course_code",
            "type", "type_display", "min_grade",
        ]
        read_only_fields = ["id"]


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    course_name = serializers.CharField(source="course_offering.course.name", read_only=True)
    course_code = serializers.CharField(source="course_offering.course.code", read_only=True)
    semester_name = serializers.CharField(source="course_offering.semester.name", read_only=True)
    grade_points = serializers.FloatField(read_only=True)
    is_pass = serializers.BooleanField(read_only=True)

    class Meta:
        model = Grade
        fields = [
            "id", "student", "student_name",
            "course_offering", "course_name", "course_code", "semester_name",
            "grade_letter", "grade_points", "credits_earned",
            "is_pass", "remarks", "published_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

