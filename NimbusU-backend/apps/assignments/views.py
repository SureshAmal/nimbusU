"""Views for the assignments app."""

import csv

from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrFaculty, IsFaculty, IsOwnerOrAdmin

from .models import Assignment, Submission
from .serializers import (
    AssignmentSerializer,
    GradeSubmissionSerializer,
    SubmissionSerializer,
)


class AssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AssignmentSerializer
    filterset_fields = ["course_offering", "assignment_type", "is_published"]
    search_fields = ["title"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Assignment.objects.none()
        qs = Assignment.objects.select_related(
            "created_by", "course_offering__course"
        ).all()
        if self.request.user.role == "student":
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsFaculty()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return Assignment.objects.select_related(
            "created_by", "course_offering__course"
        ).all()


class SubmitWorkView(generics.CreateAPIView):
    """POST /api/v1/assignments/{id}/submit/"""

    serializer_class = SubmissionSerializer

    def perform_create(self, serializer):
        assignment_id = self.kwargs["pk"]
        serializer.save(
            student=self.request.user,
            assignment_id=assignment_id,
        )


class AssignmentSubmissionsView(generics.ListAPIView):
    """GET /api/v1/assignments/{id}/submissions/"""

    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Submission.objects.none()
        return Submission.objects.filter(
            assignment_id=self.kwargs["pk"]
        ).select_related("student")


class MySubmissionView(APIView):
    """GET /api/v1/assignments/{id}/submissions/me/"""

    @extend_schema(
        responses={200: SubmissionSerializer},
        tags=["Submissions"],
    )
    def get(self, request, pk):
        try:
            submission = Submission.objects.get(
                assignment_id=pk, student=request.user
            )
            return Response(
                {"status": "success", "data": SubmissionSerializer(submission).data}
            )
        except Submission.DoesNotExist:
            return Response(
                {"status": "error", "message": "No submission found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class GradeSubmissionView(APIView):
    """PATCH /api/v1/assignments/{pk}/submissions/{sub_id}/grade/"""

    permission_classes = [permissions.IsAuthenticated, IsFaculty]

    @extend_schema(
        request=GradeSubmissionSerializer,
        responses={200: SubmissionSerializer},
        tags=["Submissions"],
    )
    def patch(self, request, pk, sub_id):
        try:
            submission = Submission.objects.get(pk=sub_id, assignment_id=pk)
        except Submission.DoesNotExist:
            return Response(
                {"status": "error", "message": "Submission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = GradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission.marks_obtained = serializer.validated_data["marks_obtained"]
        submission.grade = serializer.validated_data.get("grade", "")
        submission.feedback = serializer.validated_data.get("feedback", "")
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.status = "graded"
        submission.save()

        return Response(
            {"status": "success", "data": SubmissionSerializer(submission).data}
        )


class ExportGradesView(APIView):
    """GET /api/v1/assignments/export/{offering_id}/ — CSV export."""

    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    @extend_schema(
        responses={(200, "text/csv"): bytes},
        tags=["Assignments"],
    )
    def get(self, request, offering_id):
        submissions = Submission.objects.filter(
            assignment__course_offering_id=offering_id
        ).select_related("student", "assignment")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="grades_{offering_id}.csv"'
        )
        writer = csv.writer(response)
        writer.writerow([
            "Student", "Email", "Assignment", "Marks", "Grade", "Status"
        ])
        for sub in submissions:
            writer.writerow([
                sub.student.full_name,
                sub.student.email,
                sub.assignment.title,
                sub.marks_obtained or "",
                sub.grade or "",
                sub.status,
            ])
        return response
