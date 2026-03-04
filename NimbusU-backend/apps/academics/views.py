"""Views for the academics app."""

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.serializers import UserListSerializer

from .models import AcademicEvent, Course, CourseOffering, Department, Enrollment, Program, School, Semester
from .serializers import (
    CourseOfferingSerializer,
    CourseSerializer,
    DepartmentSerializer,
    EnrollmentSerializer,
    ProgramSerializer,
    SchoolSerializer,
    SemesterSerializer,
    AcademicEventSerializer,
)

User = get_user_model()


# ─── Schools ────────────────────────────────────────────────────────────


class SchoolListCreateView(generics.ListCreateAPIView):
    queryset = School.objects.select_related("dean").all()
    serializer_class = SchoolSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class SchoolDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = School.objects.select_related("dean").all()
    serializer_class = SchoolSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


# ─── Departments ────────────────────────────────────────────────────────


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.select_related("head", "school").all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.select_related("head", "school").all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


# ─── Programs ───────────────────────────────────────────────────────────


class ProgramListCreateView(generics.ListCreateAPIView):
    queryset = Program.objects.select_related("department").all()
    serializer_class = ProgramSerializer
    filterset_fields = ["department", "degree_type", "is_active"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class ProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Program.objects.select_related("department").all()
    serializer_class = ProgramSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


# ─── Semesters ──────────────────────────────────────────────────────────


class SemesterListCreateView(generics.ListCreateAPIView):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class SemesterDetailView(generics.RetrieveUpdateAPIView):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class CurrentSemesterView(APIView):
    """GET /api/v1/academics/semesters/current/"""

    @extend_schema(
        responses={200: SemesterSerializer},
        tags=["Semesters"],
    )
    def get(self, request):
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            return Response(
                {"status": "error", "message": "No current semester set."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"status": "success", "data": SemesterSerializer(semester).data}
        )


# ─── Courses ────────────────────────────────────────────────────────────


class CourseListCreateView(generics.ListCreateAPIView):
    queryset = Course.objects.select_related("department").all()
    serializer_class = CourseSerializer
    filterset_fields = ["department", "is_active"]
    search_fields = ["name", "code"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.select_related("department").all()
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


# ─── Course Offerings ───────────────────────────────────────────────────


class CourseOfferingListCreateView(generics.ListCreateAPIView):
    serializer_class = CourseOfferingSerializer
    filterset_fields = ["course", "semester", "faculty"]

    def get_queryset(self):
        return CourseOffering.objects.select_related(
            "course", "semester", "faculty"
        ).all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class CourseOfferingDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CourseOfferingSerializer

    def get_queryset(self):
        return CourseOffering.objects.select_related(
            "course", "semester", "faculty"
        ).all()

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class CourseOfferingStudentsView(generics.ListAPIView):
    """GET /api/v1/academics/offerings/{id}/students/"""

    serializer_class = UserListSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        offering_id = self.kwargs["pk"]
        student_ids = Enrollment.objects.filter(
            course_offering_id=offering_id, status="active"
        ).values_list("student_id", flat=True)
        return User.objects.filter(id__in=student_ids)


# ─── Enrollments ────────────────────────────────────────────────────────


class EnrollmentCreateView(generics.CreateAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


class EnrollmentDeleteView(generics.DestroyAPIView):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


class MyEnrollmentsView(generics.ListAPIView):
    """GET /api/v1/academics/enrollments/me/"""

    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Enrollment.objects.none()
        return Enrollment.objects.filter(
            student=self.request.user
        ).select_related("course_offering__course")


# ─── Academic Calendar ──────────────────────────────────────────────────


class AcademicEventListCreateView(generics.ListCreateAPIView):
    serializer_class = AcademicEventSerializer
    filterset_fields = ["event_type", "semester", "is_university_wide", "department"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        return AcademicEvent.objects.select_related(
            "semester", "department", "created_by"
        ).all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AcademicEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AcademicEventSerializer

    def get_queryset(self):
        return AcademicEvent.objects.select_related(
            "semester", "department", "created_by"
        ).all()

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]
