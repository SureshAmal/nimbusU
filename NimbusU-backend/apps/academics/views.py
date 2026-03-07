"""Views for the academics app."""

import csv
from collections import defaultdict
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db import models
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsAdminOrFaculty
from apps.accounts.serializers import UserListSerializer

from .models import (
    AcademicEvent, Course, CourseOffering, CoursePrerequisite,
    DailyQuestion, DailyQuestionAssignment, DailyQuestionResponse,
    Department, Enrollment, Grade, Program, School, Semester, StudentTask,
    StudentDailyQuestionPerformance,
)
from .serializers import (
    AcademicEventSerializer,
    CourseOfferingSerializer,
    CoursePrerequisiteSerializer,
    CourseSerializer,
    FacultyDailyQuestionStudentScoreSerializer,
    DailyQuestionAssignmentSerializer,
    DailyQuestionListSerializer,
    DailyQuestionSerializer,
    DailyQuestionSubmitSerializer,
    DepartmentSerializer,
    EnrollmentBulkCreateSerializer,
    EnrollmentSerializer,
    GradeSerializer,
    ProgramSerializer,
    SchoolSerializer,
    SemesterSerializer,
    StudentDailyQuestionPerformanceSerializer,
    StudentTaskSerializer,
)

User = get_user_model()


def _user_can_manage_question(user, question: DailyQuestion) -> bool:
    return getattr(user, "role", None) == "admin" or question.created_by.pk == user.pk


def _sync_daily_question_performance(student) -> None:
    assignments = (
        DailyQuestionAssignment.objects.filter(student=student)
        .select_related("question")
        .order_by("question__scheduled_date", "assigned_at")
    )

    if not assignments.exists():
        StudentDailyQuestionPerformance.objects.filter(student=student).delete()
        return

    daily_stats: dict = defaultdict(
        lambda: {
            "total_assigned": 0,
            "total_submitted": 0,
            "total_correct": 0,
            "total_points_earned": 0,
            "total_time_seconds": 0,
        }
    )

    for assignment in assignments:
        stat = daily_stats[assignment.question.scheduled_date]
        stat["total_assigned"] += 1

        if assignment.status in {
            DailyQuestionAssignment.Status.SUBMITTED,
            DailyQuestionAssignment.Status.GRADED,
        }:
            stat["total_submitted"] += 1
            stat["total_time_seconds"] += assignment.time_taken_seconds or 0

        if assignment.is_correct:
            stat["total_correct"] += 1

        stat["total_points_earned"] += assignment.points_earned or 0

    previous_date = None
    running_streak = 0
    longest_streak = 0
    computed_dates = []

    for stat_date in sorted(daily_stats.keys()):
        has_correct_submission = daily_stats[stat_date]["total_correct"] > 0

        if has_correct_submission:
            if previous_date and stat_date == previous_date + timedelta(days=1):
                running_streak += 1
            else:
                running_streak = 1
            longest_streak = max(longest_streak, running_streak)
        else:
            running_streak = 0

        StudentDailyQuestionPerformance.objects.update_or_create(
            student=student,
            date=stat_date,
            defaults={
                **daily_stats[stat_date],
                "current_streak": running_streak,
                "longest_streak": longest_streak,
            },
        )
        computed_dates.append(stat_date)
        previous_date = stat_date

    StudentDailyQuestionPerformance.objects.filter(student=student).exclude(
        date__in=computed_dates
    ).delete()


def _scheduled_datetime(date_value, time_value, *, end_of_day: bool = False):
    tz = timezone.get_current_timezone()
    if time_value is None:
        if end_of_day:
            return timezone.make_aware(datetime.combine(date_value, datetime.max.time()), tz)
        return timezone.make_aware(datetime.combine(date_value, datetime.min.time()), tz)
    return timezone.make_aware(datetime.combine(date_value, time_value), tz)


def _sync_assignment_status(assignment: DailyQuestionAssignment, now=None) -> DailyQuestionAssignment:
    """Normalize assignment status from question schedule and availability window."""
    if now is None:
        now = timezone.now()

    question = assignment.question
    current_status = assignment.status
    next_status = current_status

    # Do not overwrite terminal states.
    if current_status in {
        DailyQuestionAssignment.Status.SUBMITTED,
        DailyQuestionAssignment.Status.GRADED,
    }:
        return assignment

    if not question.is_active:
        next_status = DailyQuestionAssignment.Status.EXPIRED
    else:
        starts_at = _scheduled_datetime(question.scheduled_date, question.start_time)
        ends_at = _scheduled_datetime(question.scheduled_date, question.end_time, end_of_day=True)

        if current_status in {
            DailyQuestionAssignment.Status.PENDING,
            DailyQuestionAssignment.Status.ASSIGNED,
        }:
            if now < starts_at:
                next_status = DailyQuestionAssignment.Status.PENDING
            elif now > ends_at:
                next_status = DailyQuestionAssignment.Status.EXPIRED
            else:
                next_status = DailyQuestionAssignment.Status.ASSIGNED
        elif current_status == DailyQuestionAssignment.Status.STARTED and now > ends_at:
            next_status = DailyQuestionAssignment.Status.EXPIRED

    if next_status != current_status:
        assignment.status = next_status
        assignment.save(update_fields=["status"])

    return assignment


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
    """GET /api/v1/enrollments/me/"""

    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Enrollment.objects.none()
        return Enrollment.objects.filter(
            student=self.request.user
        ).select_related("course_offering__course")


class ExportEnrollmentsView(APIView):
    """GET /api/v1/enrollments/export/ — Export enrollments as CSV."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: serializers.CharField(help_text="CSV file content")},
        tags=["Academics"],
    )
    def get(self, request):
        if request.user.role == "student":
            enrollments = Enrollment.objects.filter(student=request.user)
        elif request.user.role in ("faculty", "dean", "head", "admin"):
            enrollments = Enrollment.objects.all()
        else:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        enrollments = enrollments.select_related(
            "student",
            "course_offering__course",
            "course_offering__semester",
            "course_offering__faculty",
        )

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="enrollments_export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Enrollment ID",
            "Student",
            "Student ID",
            "Course Code",
            "Course Name",
            "Semester",
            "Section",
            "Faculty",
            "Status",
            "Enrolled At",
        ])

        for enrollment in enrollments:
            writer.writerow([
                str(enrollment.id),
                enrollment.student.full_name,
                str(enrollment.student_id),
                enrollment.course_offering.course.code,
                enrollment.course_offering.course.name,
                enrollment.course_offering.semester.name,
                enrollment.course_offering.section,
                enrollment.course_offering.faculty.full_name,
                enrollment.status,
                enrollment.enrolled_at.isoformat(),
            ])

        return response


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


# ─── Daily Questions ───────────────────────────────────────────────────


class DailyQuestionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    def get_queryset(self):
        queryset = DailyQuestion.objects.select_related(
            "created_by", "course_offering__course"
        )

        if getattr(self.request.user, "role", None) != "admin":
            queryset = queryset.filter(created_by=self.request.user)

        course_offering = self.request.GET.get("course_offering")
        is_active = self.request.GET.get("is_active")
        scheduled_date = self.request.GET.get("scheduled_date")

        if course_offering:
            queryset = queryset.filter(course_offering_id=course_offering)
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        if scheduled_date:
            queryset = queryset.filter(scheduled_date=scheduled_date)

        return queryset

    def get_serializer_class(self):
        if self.request.method == "GET":
            return DailyQuestionListSerializer
        return DailyQuestionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DailyQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DailyQuestionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    def get_queryset(self):
        queryset = DailyQuestion.objects.select_related(
            "created_by", "course_offering__course"
        )
        if getattr(self.request.user, "role", None) != "admin":
            queryset = queryset.filter(created_by=self.request.user)
        return queryset


class DailyQuestionAssignView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    @extend_schema(
        request=inline_serializer(
            "DailyQuestionAssignRequest",
            {
                "student_ids": serializers.ListField(
                    child=serializers.UUIDField(), allow_empty=False
                ),
                "batch": serializers.CharField(required=False, allow_blank=True),
            },
        ),
        responses={200: inline_serializer(
            "DailyQuestionAssignResponse",
            {
                "assigned_count": serializers.IntegerField(),
                "skipped_count": serializers.IntegerField(),
            },
        )},
        tags=["Daily Questions"],
    )
    def post(self, request, pk):
        question = get_object_or_404(DailyQuestion, pk=pk)
        if not _user_can_manage_question(request.user, question):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        student_ids = request.data.get("student_ids") or []
        batch = request.data.get("batch", "")

        if not student_ids:
            return Response(
                {"detail": "At least one student must be selected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        students = User.objects.filter(
            id__in=student_ids,
            role="student",
            is_active=True,
        ).distinct()

        assigned_count = 0
        skipped_count = 0

        for student in students:
            assignment, created = DailyQuestionAssignment.objects.get_or_create(
                question=question,
                student=student,
                defaults={
                    "batch": batch or getattr(getattr(student, "student_profile", None), "batch", "") or "",
                    "status": DailyQuestionAssignment.Status.ASSIGNED,
                },
            )

            if created:
                assigned_count += 1
            else:
                if assignment.status in {
                    DailyQuestionAssignment.Status.SUBMITTED,
                    DailyQuestionAssignment.Status.GRADED,
                }:
                    skipped_count += 1
                    continue
                assignment.batch = batch or assignment.batch
                assignment.status = DailyQuestionAssignment.Status.ASSIGNED
                assignment.started_at = None
                assignment.submitted_at = None
                assignment.time_taken_seconds = None
                assignment.points_earned = 0
                assignment.is_correct = False
                assignment.is_valid = True
                assignment.invalid_reason = ""
                assignment.save(
                    update_fields=[
                        "batch",
                        "status",
                        "started_at",
                        "submitted_at",
                        "time_taken_seconds",
                        "points_earned",
                        "is_correct",
                        "is_valid",
                        "invalid_reason",
                    ]
                )
                DailyQuestionResponse.objects.filter(assignment=assignment).delete()
                assigned_count += 1

            _sync_daily_question_performance(student)

        return Response(
            {"assigned_count": assigned_count, "skipped_count": skipped_count}
        )


class DailyQuestionStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    @extend_schema(tags=["Daily Questions"])
    def get(self, request):
        questions = DailyQuestion.objects.all()
        if getattr(request.user, "role", None) != "admin":
            questions = questions.filter(created_by=request.user)

        assignments = DailyQuestionAssignment.objects.filter(question__in=questions)
        total_assigned = assignments.count()
        total_submitted = assignments.filter(
            status__in=[
                DailyQuestionAssignment.Status.SUBMITTED,
                DailyQuestionAssignment.Status.GRADED,
            ]
        ).count()
        total_correct = assignments.filter(is_correct=True).count()
        avg_time = (
            assignments.filter(time_taken_seconds__isnull=False).aggregate(
                average=models.Avg("time_taken_seconds")
            )["average"]
            or 0
        )
        accuracy_rate = round((total_correct / total_submitted) * 100, 2) if total_submitted else 0

        return Response(
            {
                "total_assigned": total_assigned,
                "total_submitted": total_submitted,
                "total_correct": total_correct,
                "average_time_seconds": int(avg_time),
                "accuracy_rate": accuracy_rate,
            }
        )


class FacultyDailyQuestionStudentScoresView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    @extend_schema(
        tags=["Daily Questions"],
        responses=FacultyDailyQuestionStudentScoreSerializer(many=True),
    )
    def get(self, request):
        assignments = DailyQuestionAssignment.objects.select_related(
            "student",
            "student__student_profile",
            "question__course_offering__course",
            "question__created_by",
        )

        if getattr(request.user, "role", None) != "admin":
            assignments = assignments.filter(question__created_by=request.user)

        course_offering = request.GET.get("course_offering")
        question_id = request.GET.get("question")
        search = (request.GET.get("search") or "").strip().lower()

        if course_offering:
            assignments = assignments.filter(question__course_offering_id=course_offering)
        if question_id:
            assignments = assignments.filter(question_id=question_id)

        student_rows = {}
        score_statuses = {
            DailyQuestionAssignment.Status.SUBMITTED,
            DailyQuestionAssignment.Status.GRADED,
        }

        for assignment in assignments:
            student = assignment.student
            row = student_rows.setdefault(
                student.id,
                {
                    "student": student.id,
                    "student_name": student.full_name,
                    "email": student.email,
                    "batch": getattr(getattr(student, "student_profile", None), "batch", ""),
                    "division": getattr(getattr(student, "student_profile", None), "division", ""),
                    "course_names": set(),
                    "total_assigned": 0,
                    "total_submitted": 0,
                    "total_correct": 0,
                    "total_points_earned": 0,
                    "total_time_seconds": 0,
                    "average_time_seconds": 0,
                    "accuracy_rate": 0.0,
                    "current_streak": 0,
                    "longest_streak": 0,
                    "latest_activity": None,
                },
            )

            row["total_assigned"] += 1
            if assignment.question.course_offering:
                row["course_names"].add(assignment.question.course_offering.course.name)

            if assignment.status in score_statuses:
                row["total_submitted"] += 1
            if assignment.is_correct:
                row["total_correct"] += 1

            row["total_points_earned"] += assignment.points_earned
            row["total_time_seconds"] += assignment.time_taken_seconds or 0

            latest_activity = assignment.submitted_at or assignment.started_at or assignment.assigned_at
            if latest_activity and (
                row["latest_activity"] is None or latest_activity > row["latest_activity"]
            ):
                row["latest_activity"] = latest_activity

        if not student_rows:
            return Response([])

        performance_rows = (
            StudentDailyQuestionPerformance.objects.filter(student_id__in=student_rows.keys())
            .order_by("student_id", "-date")
        )
        performance_map = defaultdict(list)
        for performance in performance_rows:
            performance_map[performance.student_id].append(performance)

        results = []
        for student_id, row in student_rows.items():
            performances = performance_map.get(student_id, [])
            latest_performance = performances[0] if performances else None
            row["current_streak"] = latest_performance.current_streak if latest_performance else 0
            row["longest_streak"] = max(
                [performance.longest_streak for performance in performances], default=0
            )
            row["course_names"] = sorted(row["course_names"])
            row["average_time_seconds"] = int(
                row["total_time_seconds"] / row["total_submitted"]
            ) if row["total_submitted"] else 0
            row["accuracy_rate"] = round(
                (row["total_correct"] / row["total_submitted"]) * 100, 2
            ) if row["total_submitted"] else 0.0

            if search:
                haystack = " ".join(
                    [
                        row["student_name"],
                        row["email"],
                        row["batch"] or "",
                        row["division"] or "",
                        " ".join(row["course_names"]),
                    ]
                ).lower()
                if search not in haystack:
                    continue

            results.append(row)

        results.sort(
            key=lambda item: (
                -item["total_points_earned"],
                -item["accuracy_rate"],
                -item["total_correct"],
                item["student_name"],
            )
        )

        serializer = FacultyDailyQuestionStudentScoreSerializer(results, many=True)
        return Response(serializer.data)


class MyDailyQuestionAssignmentsView(generics.ListAPIView):
    serializer_class = DailyQuestionAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, "role", None) != "student":
            return DailyQuestionAssignment.objects.none()
        queryset = DailyQuestionAssignment.objects.filter(student=self.request.user).select_related(
            "student", "question"
        )
        now = timezone.now()
        for assignment in queryset:
            _sync_assignment_status(assignment, now=now)
        return queryset


class MyDailyQuestionPerformanceView(generics.ListAPIView):
    serializer_class = StudentDailyQuestionPerformanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, "role", None) != "student":
            return StudentDailyQuestionPerformance.objects.none()
        _sync_daily_question_performance(self.request.user)
        return StudentDailyQuestionPerformance.objects.filter(
            student=self.request.user
        ).order_by("-date")


class DailyQuestionStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=["Daily Questions"])
    def post(self, request, pk):
        if getattr(request.user, "role", None) != "student":
            return Response({"detail": "Only students can start questions."}, status=status.HTTP_403_FORBIDDEN)

        assignment = get_object_or_404(
            DailyQuestionAssignment.objects.select_related("question"),
            pk=pk,
            student=request.user,
        )

        _sync_assignment_status(assignment)

        if assignment.status in {
            DailyQuestionAssignment.Status.SUBMITTED,
            DailyQuestionAssignment.Status.GRADED,
            DailyQuestionAssignment.Status.EXPIRED,
        }:
            return Response(
                {"detail": "This question can no longer be started."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if assignment.status == DailyQuestionAssignment.Status.PENDING:
            return Response(
                {"detail": "This question is not available yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not assignment.question.is_active:
            return Response(
                {"detail": "This question is not active."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if assignment.started_at is None:
            assignment.started_at = timezone.now()
        assignment.status = DailyQuestionAssignment.Status.STARTED
        assignment.save(update_fields=["started_at", "status"])

        return Response(
            {
                "id": str(assignment.id),
                "started_at": assignment.started_at,
                "status": assignment.status,
            }
        )


class DailyQuestionSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=DailyQuestionSubmitSerializer,
        tags=["Daily Questions"],
    )
    def post(self, request, pk):
        if getattr(request.user, "role", None) != "student":
            return Response({"detail": "Only students can submit answers."}, status=status.HTTP_403_FORBIDDEN)

        assignment = get_object_or_404(
            DailyQuestionAssignment.objects.select_related("question", "student"),
            pk=pk,
            student=request.user,
        )

        serializer = DailyQuestionSubmitSerializer(
            data={"assignment_id": pk, **request.data}
        )
        serializer.is_valid(raise_exception=True)

        now = timezone.now()
        if assignment.started_at is None:
            assignment.started_at = now

        question = assignment.question
        validated_data = serializer.validated_data if isinstance(serializer.validated_data, dict) else {}
        selected_options = validated_data.get("selected_options") or []
        code_answer = validated_data.get("code_answer", "")

        normalized_correct = question.correct_answer
        is_correct = False

        if question.question_type == DailyQuestion.QuestionType.PROGRAMMING:
            expected_answer = normalized_correct if isinstance(normalized_correct, str) else ""
            is_correct = bool(code_answer.strip()) and code_answer.strip() == expected_answer.strip()
        elif question.question_type == DailyQuestion.QuestionType.SINGLE:
            correct_value = normalized_correct
            if isinstance(correct_value, list):
                correct_value = correct_value[0] if correct_value else None
            submitted_value = selected_options[0] if selected_options else None
            is_correct = submitted_value == correct_value
        else:
            correct_values = normalized_correct if isinstance(normalized_correct, list) else [normalized_correct]
            is_correct = sorted(selected_options) == sorted([v for v in correct_values if v is not None])

        points_earned = question.points if is_correct else 0
        time_taken_seconds = max(int((now - assignment.started_at).total_seconds()), 0)

        DailyQuestionResponse.objects.update_or_create(
            assignment=assignment,
            defaults={
                "selected_options": selected_options or None,
                "code_answer": code_answer,
                "is_correct": is_correct,
                "marks_obtained": points_earned,
                "ip_address": request.META.get("REMOTE_ADDR"),
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            },
        )

        assignment.status = DailyQuestionAssignment.Status.GRADED
        assignment.submitted_at = now
        assignment.time_taken_seconds = time_taken_seconds
        assignment.points_earned = points_earned
        assignment.is_correct = is_correct
        assignment.save(
            update_fields=[
                "status",
                "started_at",
                "submitted_at",
                "time_taken_seconds",
                "points_earned",
                "is_correct",
            ]
        )

        _sync_daily_question_performance(request.user)

        return Response(
            {
                "assignment_id": str(assignment.id),
                "is_correct": is_correct,
                "points_earned": points_earned,
                "submitted_at": assignment.submitted_at,
                "time_taken_seconds": time_taken_seconds,
            }
        )


# ─── Student Tasks ────────────────────────────────────────────────────────
class StudentTaskViewSet(generics.ListCreateAPIView):
    """GET /api/v1/academics/tasks/ and POST /api/v1/academics/tasks/"""
    serializer_class = StudentTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudentTask.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

class StudentTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH, DELETE /api/v1/academics/tasks/<id>/"""
    serializer_class = StudentTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudentTask.objects.filter(student=self.request.user)
