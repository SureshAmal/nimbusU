"""Serializers for the assignments app."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Assignment, Submission, GradingRubric, RubricCriteria, AssignmentGroup


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


class RubricCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricCriteria
        fields = ["id", "rubric", "name", "description", "max_marks", "order"]
        read_only_fields = ["id", "rubric"]


class GradingRubricSerializer(serializers.ModelSerializer):
    criteria = RubricCriteriaSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )

    class Meta:
        model = GradingRubric
        fields = [
            "id", "assignment", "created_by", "created_by_name",
            "criteria", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]


class AssignmentGroupSerializer(serializers.ModelSerializer):
    member_names = serializers.SerializerMethodField()
    submission_id = serializers.UUIDField(
        source="submission.id", read_only=True, allow_null=True
    )

    class Meta:
        model = AssignmentGroup
        fields = [
            "id", "assignment", "name", "members", "member_names",
            "submission", "submission_id", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "submission"]

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_member_names(self, obj) -> list[str]:
        return [user.full_name for user in obj.members.all()]

