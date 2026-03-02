"""Serializers for the assignments app."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Assignment, Submission


class AssignmentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )
    course_name = serializers.CharField(
        source="course_offering.course.name", read_only=True
    )
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id", "title", "description", "course_offering", "course_name",
            "created_by", "created_by_name", "due_date", "max_marks",
            "assignment_type", "attachments", "is_published",
            "submission_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]

    @extend_schema_field(serializers.IntegerField)
    def get_submission_count(self, obj) -> int:
        return obj.submissions.count()


class SubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.full_name", read_only=True
    )

    class Meta:
        model = Submission
        fields = [
            "id", "assignment", "student", "student_name",
            "file", "text_content", "submitted_at",
            "marks_obtained", "grade", "feedback",
            "graded_by", "graded_at", "status",
        ]
        read_only_fields = [
            "id", "submitted_at", "student", "assignment",
            "graded_by", "graded_at",
        ]


class GradeSubmissionSerializer(serializers.Serializer):
    """Serializer for grading a submission."""

    marks_obtained = serializers.DecimalField(max_digits=6, decimal_places=2)
    grade = serializers.CharField(max_length=5, required=False)
    feedback = serializers.CharField(required=False, allow_blank=True)
