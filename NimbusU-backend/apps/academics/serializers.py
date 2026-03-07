"""Serializers for the academics app."""

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

User = get_user_model()

from .models import (
    AcademicEvent, Course, CourseOffering, CoursePrerequisite,
    Department, Enrollment, Grade, Program, School, Semester, StudentTask,
    DailyQuestion, DailyQuestionAssignment, DailyQuestionResponse,
    StudentDailyQuestionPerformance
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


class StudentTaskSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course_offering.course.name", read_only=True, default=None)
    
    class Meta:
        model = StudentTask
        fields = [
            "id", "student", "course_offering", "course_name",
            "title", "description", "due_date", "is_completed",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "student", "created_at", "updated_at"]


class DailyQuestionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    course_name = serializers.CharField(source="course_offering.course.name", read_only=True, default=None)
    question_type_display = serializers.CharField(source="get_question_type_display", read_only=True)
    difficulty_display = serializers.CharField(source="get_difficulty_display", read_only=True)
    
    class Meta:
        model = DailyQuestion
        fields = [
            "id", "title", "description", "question_type", "question_type_display",
            "difficulty", "difficulty_display", "question_text", "options",
            "correct_answer", "test_cases", "starter_code", "language",
            "points", "time_limit_minutes", "scheduled_date", "start_time", "end_time",
            "is_active", "course_offering", "course_name", "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class DailyQuestionListSerializer(serializers.ModelSerializer):
    """Serializer for listing questions - hides correct answers."""
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    course_name = serializers.CharField(source="course_offering.course.name", read_only=True, default=None)
    question_type_display = serializers.CharField(source="get_question_type_display", read_only=True)
    difficulty_display = serializers.CharField(source="get_difficulty_display", read_only=True)
    total_assignments = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyQuestion
        fields = [
            "id", "title", "description", "question_type", "question_type_display",
            "difficulty", "difficulty_display", "question_text", "options",
            "correct_answer", "starter_code", "language",
            "points", "time_limit_minutes",
            "scheduled_date", "start_time", "end_time", "is_active",
            "course_offering", "course_name", "created_by", "created_by_name",
            "created_at", "total_assignments",
        ]
        read_only_fields = ["id", "created_by", "created_at"]
    
    @extend_schema_field(serializers.IntegerField)
    def get_total_assignments(self, obj) -> int:
        return obj.assignments.count()


class DailyQuestionAssignmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    question_title = serializers.CharField(source="question.title", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    options = serializers.JSONField(source="question.options", read_only=True)
    starter_code = serializers.CharField(source="question.starter_code", read_only=True)
    points = serializers.IntegerField(source="question.points", read_only=True)
    time_limit_minutes = serializers.IntegerField(source="question.time_limit_minutes", read_only=True)
    scheduled_date = serializers.DateField(source="question.scheduled_date", read_only=True)
    start_time = serializers.TimeField(source="question.start_time", read_only=True)
    end_time = serializers.TimeField(source="question.end_time", read_only=True)
    is_active = serializers.BooleanField(source="question.is_active", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    
    class Meta:
        model = DailyQuestionAssignment
        fields = [
            "id", "question", "question_title", "student", "student_name",
            "question_type", "question_text", "options", "starter_code", "points",
            "time_limit_minutes", "scheduled_date", "start_time", "end_time", "is_active",
            "batch", "status", "status_display", "assigned_at", "started_at",
            "submitted_at", "time_taken_seconds", "points_earned", "is_correct",
            "is_valid", "invalid_reason",
        ]
        read_only_fields = ["id", "assigned_at", "started_at", "submitted_at",
                           "time_taken_seconds", "points_earned", "is_correct"]


class DailyQuestionAssignmentCreateSerializer(serializers.Serializer):
    """Serializer for creating assignments to multiple students."""
    question = serializers.PrimaryKeyRelatedField(queryset=DailyQuestion.objects.all())
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of student UUIDs to assign"
    )
    batch = serializers.CharField(required=False, allow_blank=True)


class DailyQuestionAssignmentByBatchSerializer(serializers.Serializer):
    """Serializer for assigning question to students by batch."""
    question = serializers.PrimaryKeyRelatedField(queryset=DailyQuestion.objects.all())
    batches = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of batch codes (e.g., ['2024-A', '2024-B'])"
    )
    course_offering = serializers.PrimaryKeyRelatedField(
        queryset=CourseOffering.objects.all(), required=False, allow_null=True
    )


class DailyQuestionResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyQuestionResponse
        fields = [
            "id", "assignment", "selected_options", "code_answer", "output_result",
            "is_correct", "marks_obtained", "ip_address", "user_agent",
            "is_manually_verified", "verified_by", "verification_notes", "submitted_at",
        ]
        read_only_fields = ["id", "is_correct", "marks_obtained", "ip_address",
                           "user_agent", "submitted_at"]


class DailyQuestionSubmitSerializer(serializers.Serializer):
    """Serializer for student to submit their answer."""
    assignment_id = serializers.UUIDField()
    selected_options = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    code_answer = serializers.CharField(required=False, allow_blank=True)


class StudentDailyQuestionPerformanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    
    class Meta:
        model = StudentDailyQuestionPerformance
        fields = [
            "id", "student", "student_name", "date",
            "total_assigned", "total_submitted", "total_correct",
            "total_points_earned", "total_time_seconds",
            "current_streak", "longest_streak",
        ]
        read_only_fields = ["id"]


class FacultyDailyQuestionStudentScoreSerializer(serializers.Serializer):
    student = serializers.UUIDField()
    student_name = serializers.CharField()
    email = serializers.EmailField()
    batch = serializers.CharField(allow_blank=True, allow_null=True)
    division = serializers.CharField(allow_blank=True, allow_null=True)
    course_names = serializers.ListField(child=serializers.CharField())
    total_assigned = serializers.IntegerField()
    total_submitted = serializers.IntegerField()
    total_correct = serializers.IntegerField()
    total_points_earned = serializers.IntegerField()
    total_time_seconds = serializers.IntegerField()
    average_time_seconds = serializers.IntegerField()
    accuracy_rate = serializers.FloatField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    latest_activity = serializers.DateTimeField(allow_null=True)

