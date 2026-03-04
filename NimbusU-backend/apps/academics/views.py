"""Views for the academics app."""

import csv
from django.contrib.auth import get_user_model
from django.db import models
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsAdminOrFaculty
from apps.accounts.serializers import UserListSerializer

from .models import (
    AcademicEvent, Course, CourseOffering, CoursePrerequisite,
    Department, Enrollment, Grade, Program, School, Semester,
)
from .serializers import (
    CourseOfferingSerializer,
    CoursePrerequisiteSerializer,
    CourseSerializer,
    DepartmentSerializer,
    EnrollmentSerializer,
    EnrollmentBulkCreateSerializer,
    GradeSerializer,
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

    def create(self, request, *args, **kwargs):
        from .models import CoursePrerequisite, Grade
        
        student_id = request.data.get("student")
        offering_id = request.data.get("course_offering")
        
        if not student_id or not offering_id:
            return Response(
                {"detail": "student and course_offering are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        try:
            student = User.objects.select_related("student_profile__program").get(id=student_id)
            offering = CourseOffering.objects.select_related("course", "semester").get(id=offering_id)
        except (User.DoesNotExist, CourseOffering.DoesNotExist):
            return Response(
                {"detail": "Invalid student or course offering."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Check Prerequisites
        prereqs = CoursePrerequisite.objects.filter(course=offering.course)
        for req in prereqs:
            # Did the student pass this required course?
            passed = Grade.objects.filter(
                student=student,
                course_offering__course=req.required_course,
                grade_letter__in=["O", "A+", "A", "B+", "B", "C", "D"] # Passing grades
            ).exists()
            
            if not passed:
                return Response(
                    {
                        "detail": f"Missing prerequisite: {req.required_course.code}",
                        "code": "missing_prerequisite"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # 2. Check Credit Limit
        if hasattr(student, 'student_profile') and student.student_profile.program:
            credit_limit = student.student_profile.program.credit_limit
            
            # Sum credits for current active enrollments in the SAME semester
            current_credits = sum(
                e.course_offering.course.credits
                for e in Enrollment.objects.filter(
                    student=student,
                    course_offering__semester=offering.semester,
                    status="active"
                ).select_related("course_offering__course")
            )
            
            if current_credits + offering.course.credits > credit_limit:
                return Response(
                    {
                        "detail": f"Credit limit exceeded. Max allowed is {credit_limit}, "
                                  f"current is {current_credits}, trying to add {offering.course.credits}.",
                        "code": "credit_limit_exceeded"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # 3. Waitlist Logic
        # Calculate current active enrollments for this offering
        current_enrollments = Enrollment.objects.filter(
            course_offering=offering, status="active"
        ).count()
        
        enroll_status = "active"
        if current_enrollments >= offering.max_students:
            enroll_status = "waitlisted"
            
        # Create enrollment
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(status=enroll_status)
        
        headers = self.get_success_headers(serializer.data)
        
        msg = "Enrolled successfully." if enroll_status == "active" else "Course full. Added to waitlist."
        resp_data = serializer.data
        resp_data["message"] = msg
        
        return Response(resp_data, status=status.HTTP_201_CREATED, headers=headers)


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


# ─── Course Prerequisites ──────────────────────────────────────────────


class CoursePrerequisiteListCreateView(generics.ListCreateAPIView):
    serializer_class = CoursePrerequisiteSerializer
    filterset_fields = ["course", "type"]

    def get_queryset(self):
        return CoursePrerequisite.objects.select_related(
            "course", "required_course"
        ).all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class CoursePrerequisiteDeleteView(generics.DestroyAPIView):
    queryset = CoursePrerequisite.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


# ─── Grades ────────────────────────────────────────────────────────────


class GradeListCreateView(generics.ListCreateAPIView):
    """Admin/faculty: list/create grades. Filterable by course_offering, student."""

    serializer_class = GradeSerializer
    filterset_fields = ["course_offering", "student", "grade_letter"]

    def get_queryset(self):
        return Grade.objects.select_related(
            "student", "course_offering__course", "course_offering__semester",
        ).all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]


class GradeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    def get_queryset(self):
        return Grade.objects.select_related(
            "student", "course_offering__course", "course_offering__semester",
        ).all()


class MyGradesView(generics.ListAPIView):
    """GET /api/v1/academics/grades/me/ — student's own grades."""

    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Grade.objects.filter(
            student=self.request.user
        ).select_related(
            "course_offering__course", "course_offering__semester",
        )


class GPAView(APIView):
    """GET /api/v1/academics/grades/gpa/ — calculate GPA/CGPA.

    Query params: ?student_id=... (admin/faculty)
    Default: current user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get("student_id")
        user = request.user

        if student_id and user.role in ("admin", "faculty", "dean", "head"):
            target_id = student_id
        else:
            target_id = str(user.id)

        grades = Grade.objects.filter(
            student_id=target_id,
        ).select_related(
            "course_offering__course", "course_offering__semester",
        ).order_by("course_offering__semester__start_date")

        if not grades.exists():
            return Response({
                "status": "success",
                "data": {"cgpa": 0, "total_credits": 0, "semesters": []},
            })

        # Group by semester
        semester_map = {}
        for g in grades:
            sem_id = str(g.course_offering.semester_id)
            if sem_id not in semester_map:
                semester_map[sem_id] = {
                    "semester_name": g.course_offering.semester.name,
                    "grades": [],
                }
            credits = g.course_offering.course.credits
            semester_map[sem_id]["grades"].append({
                "course_code": g.course_offering.course.code,
                "course_name": g.course_offering.course.name,
                "grade": g.grade_letter,
                "grade_points": g.grade_points,
                "credits": credits,
            })

        semesters = []
        total_weighted = 0
        total_credits = 0

        for sem_data in semester_map.values():
            sem_weighted = 0
            sem_credits = 0
            for g in sem_data["grades"]:
                sem_weighted += g["grade_points"] * g["credits"]
                sem_credits += g["credits"]
            sgpa = round(sem_weighted / sem_credits, 2) if sem_credits else 0
            total_weighted += sem_weighted
            total_credits += sem_credits
            semesters.append({
                "semester_name": sem_data["semester_name"],
                "sgpa": sgpa,
                "credits": sem_credits,
                "courses": sem_data["grades"],
            })

        cgpa = round(total_weighted / total_credits, 2) if total_credits else 0

        return Response({
            "status": "success",
            "data": {
                "student_id": target_id,
                "cgpa": cgpa,
                "total_credits": total_credits,
                "semesters": semesters,
            },
        })


class EnrollmentBulkCreateView(generics.CreateAPIView):
    """POST /api/v1/academics/enrollments/bulk-create/"""
    
    serializer_class = EnrollmentBulkCreateSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    @extend_schema(
        request=EnrollmentBulkCreateSerializer,
        responses={201: inline_serializer("BulkEnrollmentResponse", {
            "status": serializers.CharField(),
            "message": serializers.CharField(),
        })},
        tags=["Academics"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enrollments = serializer.save()
        
        return Response(
            {"status": "success", "message": f"{len(enrollments)} students successfully enrolled."}, 
            status=status.HTTP_201_CREATED
        )


class ExportGradesView(APIView):
    """GET /api/v1/academics/grades/export/ — Export grades as CSV."""
    
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: serializers.CharField(help_text="CSV file content")},
        tags=["Academics"],
    )
    def get(self, request):
        if request.user.role == "student":
            grades = Grade.objects.filter(student=request.user).select_related("course_offering__course", "course_offering__semester")
        elif request.user.role in ("faculty", "dean", "head", "admin"):
            grades = Grade.objects.select_related("student", "course_offering__course", "course_offering__semester").all()
            # Can add additional filtering here by faculty courses or department if needed
        else:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="grades_export.csv"'

        writer = csv.writer(response)
        writer.writerow(["Student", "Course Code", "Course Name", "Semester", "Grade", "Points", "Credits", "Pass"])

        for grade in grades:
            writer.writerow([
                grade.student.full_name,
                grade.course_offering.course.code,
                grade.course_offering.course.name,
                grade.course_offering.semester.name,
                grade.grade_letter,
                grade.grade_points,
                grade.credits_earned,
                "Yes" if grade.is_pass else "No",
            ])

        return response
