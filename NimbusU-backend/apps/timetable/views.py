"""Views for the timetable app."""

import csv
from django.db.models import Q
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import generics, permissions, serializers, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsAdminOrFaculty, IsFaculty
from apps.academics.models import Enrollment

from .models import (
    AttendanceRecord, Room, TimetableEntry, TimetableSwapRequest, 
    ClassCancellation, RoomBooking, SubstituteFaculty
)
from .serializers import (
    AttendanceRecordSerializer,
    BulkAttendanceSerializer,
    RoomSerializer,
    TimetableEntrySerializer,
    TimetableSwapRequestSerializer,
    TimetableSwapCreateSerializer,
    ClassCancellationSerializer,
    ClassCancellationCreateSerializer,
    RoomBookingSerializer,
    SubstituteFacultySerializer,
)


# ─── Rooms ──────────────────────────────────────────────────────────────


class RoomListCreateView(generics.ListCreateAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    filterset_fields = ["room_type", "is_available"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


# ─── Timetable ──────────────────────────────────────────────────────────


class TimetableListCreateView(generics.ListCreateAPIView):
    serializer_class = TimetableEntrySerializer
    filterset_fields = ["semester", "day_of_week", "batch", "subject_type", "is_active"]

    def get_queryset(self):
        qs = TimetableEntry.objects.select_related(
            "course_offering__course",
            "course_offering__faculty",
        ).all()
        faculty = self.request.query_params.get("faculty")
        department = self.request.query_params.get("department")
        if faculty:
            qs = qs.filter(course_offering__faculty_id=faculty)
        if department:
            qs = qs.filter(course_offering__course__department_id=department)
        return qs

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]


class TimetableDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TimetableEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return TimetableEntry.objects.select_related(
            "course_offering__course",
            "course_offering__faculty",
        ).all()


class MyTimetableView(generics.ListAPIView):
    """GET /api/v1/timetable/me/ — student or faculty timetable."""

    serializer_class = TimetableEntrySerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TimetableEntry.objects.none()
        user = self.request.user
        qs = TimetableEntry.objects.select_related(
            "course_offering__course",
            "course_offering__faculty",
        ).filter(is_active=True)

        batch = self.request.query_params.get("batch")
        if batch:
            qs = qs.filter(batch=batch)

        if user.role in ("faculty", "dean", "head"):
            return qs.filter(course_offering__faculty=user)
        elif user.role == "student":
            offering_ids = Enrollment.objects.filter(
                student=user, status="active"
            ).values_list("course_offering_id", flat=True)
            return qs.filter(course_offering_id__in=offering_ids)
        return qs.none()


class TimetableConflictsView(APIView):
    """GET /api/v1/timetable/conflicts/ — check location/faculty conflicts."""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @extend_schema(
        responses={200: inline_serializer("ConflictsResponse", {
            "status": serializers.CharField(),
            "data": serializers.ListField(child=serializers.DictField()),
        })},
        tags=["Timetable"],
    )
    def get(self, request):
        entries = TimetableEntry.objects.filter(is_active=True).select_related(
            "course_offering__course", "course_offering__faculty"
        )
        conflicts = []
        entries_list = list(entries)
        for i, a in enumerate(entries_list):
            for b in entries_list[i + 1 :]:
                if a.day_of_week != b.day_of_week:
                    continue
                if a.semester_id != b.semester_id:
                    continue
                if a.start_time < b.end_time and b.start_time < a.end_time:
                    # Same location conflict (only if location is non-empty)
                    if a.location and a.location == b.location:
                        conflicts.append({
                            "type": "location",
                            "location": a.location,
                            "entry_a": TimetableEntrySerializer(a).data,
                            "entry_b": TimetableEntrySerializer(b).data,
                        })
                    if a.course_offering.faculty_id == b.course_offering.faculty_id:
                        conflicts.append({
                            "type": "faculty",
                            "faculty": a.course_offering.faculty.full_name,
                            "entry_a": TimetableEntrySerializer(a).data,
                            "entry_b": TimetableEntrySerializer(b).data,
                        })
        return Response({"status": "success", "data": conflicts})


# ─── Attendance ─────────────────────────────────────────────────────────


class BulkAttendanceView(APIView):
    """POST /api/v1/attendance/mark/ — Mark attendance in bulk."""

    permission_classes = [permissions.IsAuthenticated, IsFaculty]

    @extend_schema(
        request=BulkAttendanceSerializer,
        responses={201: AttendanceRecordSerializer(many=True)},
        tags=["Attendance"],
    )
    def post(self, request):
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        created = []
        for record in data["records"]:
            obj, _ = AttendanceRecord.objects.update_or_create(
                timetable_entry_id=data["timetable_entry_id"],
                student_id=record["student_id"],
                date=data["date"],
                defaults={
                    "status": record["status"],
                    "marked_by": request.user,
                    "remarks": record.get("remarks", ""),
                },
            )
            created.append(obj)

        return Response(
            {
                "status": "success",
                "message": f"{len(created)} records processed.",
                "data": AttendanceRecordSerializer(created, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AttendanceEditView(generics.UpdateAPIView):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsFaculty]


class CourseAttendanceView(generics.ListAPIView):
    """GET /api/v1/attendance/course/{offering_id}/"""

    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AttendanceRecord.objects.none()
        offering_id = self.kwargs["offering_id"]
        return AttendanceRecord.objects.filter(
            timetable_entry__course_offering_id=offering_id
        ).select_related("student").order_by("date", "student__last_name")


@extend_schema_view(
    list=extend_schema(operation_id="attendance_me_all_list", tags=["Attendance"])
)
class MyAttendanceView(generics.ListAPIView):
    """GET /api/v1/attendance/me/"""

    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AttendanceRecord.objects.none()
        return AttendanceRecord.objects.filter(
            student=self.request.user
        ).select_related("timetable_entry__course_offering__course")


@extend_schema_view(
    list=extend_schema(operation_id="attendance_me_by_course_list", tags=["Attendance"])
)
class MyCourseAttendanceView(generics.ListAPIView):
    """GET /api/v1/attendance/me/{offering_id}/"""

    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AttendanceRecord.objects.none()
        return AttendanceRecord.objects.filter(
            student=self.request.user,
            timetable_entry__course_offering_id=self.kwargs["offering_id"],
        ).order_by("date")


# ─── Timetable Swap ────────────────────────────────────────────────────


class SwapRequestListCreateView(APIView):
    """GET  /api/v1/timetable/swap-requests/ — list my sent + received requests.
       POST /api/v1/timetable/swap-requests/ — create a new swap request."""

    permission_classes = [permissions.IsAuthenticated, IsFaculty]

    def get(self, request):
        qs = TimetableSwapRequest.objects.filter(
            Q(requester=request.user) | Q(target_faculty=request.user)
        ).select_related(
            "requester", "target_faculty",
            "requester_entry__course_offering__course",
            "requester_entry__course_offering__faculty",
            "target_entry__course_offering__course",
            "target_entry__course_offering__faculty",
        )
        data = TimetableSwapRequestSerializer(qs, many=True).data
        return Response(data)

    def post(self, request):
        ser = TimetableSwapCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            requester_entry = TimetableEntry.objects.select_related(
                "course_offering__faculty"
            ).get(id=ser.validated_data["requester_entry"])
        except TimetableEntry.DoesNotExist:
            return Response(
                {"detail": "Requester entry not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            target_entry = TimetableEntry.objects.select_related(
                "course_offering__faculty"
            ).get(id=ser.validated_data["target_entry"])
        except TimetableEntry.DoesNotExist:
            return Response(
                {"detail": "Target entry not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate: requester must own the requester_entry
        if requester_entry.course_offering.faculty != request.user:
            return Response(
                {"detail": "You can only swap your own timetable entries."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate: target_entry must belong to a different faculty
        target_faculty = target_entry.course_offering.faculty
        if target_faculty == request.user:
            return Response(
                {"detail": "Cannot swap with your own entry."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        swap = TimetableSwapRequest.objects.create(
            requester=request.user,
            target_faculty=target_faculty,
            requester_entry=requester_entry,
            target_entry=target_entry,
            message=ser.validated_data.get("message", ""),
        )

        # Send an in-app notification to the target faculty
        from apps.communications.models import Notification
        Notification.objects.create(
            user=target_faculty,
            title="Timetable Swap Request",
            message=(
                f"{request.user.full_name} wants to swap "
                f"\"{requester_entry.course_offering.course.name}\" "
                f"with your \"{target_entry.course_offering.course.name}\"."
            ),
            notification_type="timetable",
            channel="in_app",
            status="delivered",
        )

        return Response(
            TimetableSwapRequestSerializer(swap).data,
            status=status.HTTP_201_CREATED,
        )


class SwapRequestRespondView(APIView):
    """POST /api/v1/timetable/swap-requests/<id>/respond/
       Body: {"action": "approve"} or {"action": "reject"}"""

    permission_classes = [permissions.IsAuthenticated, IsFaculty]

    def post(self, request, pk):
        from django.utils import timezone as tz

        try:
            swap = TimetableSwapRequest.objects.select_related(
                "requester_entry__course_offering",
                "target_entry__course_offering",
            ).get(id=pk, target_faculty=request.user, status="pending")
        except TimetableSwapRequest.DoesNotExist:
            return Response(
                {"detail": "Swap request not found or already responded."},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")
        if action not in ("approve", "reject"):
            return Response(
                {"detail": "action must be 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "reject":
            swap.status = "rejected"
            swap.responded_at = tz.now()
            swap.save(update_fields=["status", "responded_at"])
            return Response({"status": "rejected"})

        # Approve: swap the course_offering between the two entries
        entry_a = swap.requester_entry
        entry_b = swap.target_entry
        entry_a.course_offering, entry_b.course_offering = (
            entry_b.course_offering,
            entry_a.course_offering,
        )
        entry_a.save(update_fields=["course_offering"])
        entry_b.save(update_fields=["course_offering"])

        swap.status = "approved"
        swap.responded_at = tz.now()
        swap.save(update_fields=["status", "responded_at"])

        # Notify requester
        from apps.communications.models import Notification
        Notification.objects.create(
            user=swap.requester,
            title="Swap Request Approved",
            message=f"{request.user.full_name} approved your timetable swap request.",
            notification_type="timetable",
            channel="in_app",
            status="delivered",
        )

        return Response({"status": "approved"})


# ─── Class Cancellations ───────────────────────────────────────────────


class ClassCancellationListCreateView(APIView):
    """GET  /api/v1/timetable/cancellations/ — list cancellations for my courses.
       POST /api/v1/timetable/cancellations/ — cancel or reschedule a class."""

    permission_classes = [permissions.IsAuthenticated, IsFaculty]

    def get(self, request):
        qs = ClassCancellation.objects.filter(
            cancelled_by=request.user
        ).select_related(
            "timetable_entry__course_offering__course", "cancelled_by",
        ).order_by("-original_date")
        data = ClassCancellationSerializer(qs, many=True).data
        return Response(data)

    def post(self, request):
        ser = ClassCancellationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            entry = TimetableEntry.objects.select_related(
                "course_offering__course", "course_offering__faculty"
            ).get(id=d["timetable_entry"])
        except TimetableEntry.DoesNotExist:
            return Response(
                {"detail": "Timetable entry not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if entry.course_offering.faculty != request.user:
            return Response(
                {"detail": "You can only cancel your own classes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cancellation = ClassCancellation.objects.create(
            timetable_entry=entry,
            original_date=d["original_date"],
            action=d["action"],
            reason=d.get("reason", ""),
            new_date=d.get("new_date"),
            new_start_time=d.get("new_start_time"),
            new_end_time=d.get("new_end_time"),
            new_location=d.get("new_location", ""),
            cancelled_by=request.user,
        )

        # Notify enrolled students
        from apps.communications.models import Notification
        student_ids = Enrollment.objects.filter(
            course_offering=entry.course_offering, status="active"
        ).values_list("student_id", flat=True)

        action_text = "cancelled" if d["action"] == "cancelled" else "rescheduled"
        course_name = entry.course_offering.course.name
        notifications = [
            Notification(
                user_id=sid,
                title=f"Class {action_text.title()}",
                message=(
                    f"{request.user.full_name} has {action_text} "
                    f"\"{course_name}\" on {d['original_date']}."
                    + (f" New date: {d.get('new_date')}" if d.get("new_date") else "")
                ),
                notification_type="timetable",
                channel="in_app",
                status="delivered",
            )
            for sid in student_ids
        ]
        Notification.objects.bulk_create(notifications)

        return Response(
            ClassCancellationSerializer(cancellation).data,
            status=status.HTTP_201_CREATED,
        )


# ─── Attendance Analytics ──────────────────────────────────────────────


class AttendanceSummaryView(APIView):
    """GET /api/v1/attendance/summary/ — per-course attendance % for a student.

    Query params:
      ?student_id=...  (admin/faculty can query any student)
      Default: current logged-in student.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=[
            {"name": "student_id", "in": "query", "type": "string", "required": False},
        ],
        responses={200: inline_serializer("AttendanceSummaryResponse", {
            "status": serializers.CharField(),
            "data": serializers.ListField(),
        })},
        tags=["Attendance Analytics"],
    )
    def get(self, request):
        student_id = request.query_params.get("student_id")
        user = request.user

        if student_id and user.role in ("admin", "faculty", "dean", "head"):
            target_user_id = student_id
        elif user.role == "student":
            target_user_id = str(user.id)
        else:
            return Response(
                {"detail": "student_id is required for non-student users."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get all enrollments for this student
        enrollments = Enrollment.objects.filter(
            student_id=target_user_id, status="active"
        ).select_related("course_offering__course")

        summary = []
        total_classes = 0
        total_present = 0

        for enr in enrollments:
            offering = enr.course_offering
            timetable_entries = TimetableEntry.objects.filter(
                course_offering=offering, is_active=True
            )
            entry_ids = timetable_entries.values_list("id", flat=True)

            records = AttendanceRecord.objects.filter(
                timetable_entry_id__in=entry_ids,
                student_id=target_user_id,
            )
            total = records.count()
            present = records.filter(status__in=["present", "late"]).count()
            pct = round(present / total * 100, 1) if total > 0 else 0

            total_classes += total
            total_present += present

            summary.append({
                "course_offering_id": str(offering.id),
                "course_name": offering.course.name,
                "course_code": offering.course.code,
                "total_classes": total,
                "classes_attended": present,
                "percentage": pct,
                "below_threshold": pct < 75,
            })

        overall_pct = round(total_present / total_classes * 100, 1) if total_classes > 0 else 0

        return Response({
            "status": "success",
            "data": {
                "student_id": target_user_id,
                "overall_percentage": overall_pct,
                "overall_below_threshold": overall_pct < 75,
                "courses": summary,
            },
        })


class LowAttendanceAlertView(APIView):
    """GET /api/v1/attendance/low-alert/ — students below attendance threshold.

    Query params:
      ?threshold=75  (default 75%)
      ?offering_id=... (optional, filter by course)
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    @extend_schema(
        parameters=[
            {"name": "threshold", "in": "query", "type": "float", "required": False},
            {"name": "offering_id", "in": "query", "type": "string", "required": False},
        ],
        responses={200: inline_serializer("LowAlertResponse", {
            "status": serializers.CharField(),
            "data": serializers.ListField(),
        })},
        tags=["Attendance Analytics"],
    )
    def get(self, request):
        threshold = float(request.query_params.get("threshold", 75))
        offering_id = request.query_params.get("offering_id")

        # Build enrollment queryset
        enrollments_qs = Enrollment.objects.filter(status="active").select_related(
            "student", "course_offering__course"
        )
        if offering_id:
            enrollments_qs = enrollments_qs.filter(course_offering_id=offering_id)
        elif request.user.role == "faculty":
            enrollments_qs = enrollments_qs.filter(
                course_offering__faculty=request.user
            )

        alerts = []
        for enr in enrollments_qs:
            entry_ids = TimetableEntry.objects.filter(
                course_offering=enr.course_offering, is_active=True
            ).values_list("id", flat=True)

            records = AttendanceRecord.objects.filter(
                timetable_entry_id__in=entry_ids,
                student=enr.student,
            )
            total = records.count()
            if total == 0:
                continue
            present = records.filter(status__in=["present", "late"]).count()
            pct = round(present / total * 100, 1)

            if pct < threshold:
                alerts.append({
                    "student_id": str(enr.student.id),
                    "student_name": enr.student.full_name,
                    "course_name": enr.course_offering.course.name,
                    "course_code": enr.course_offering.course.code,
                    "percentage": pct,
                    "total_classes": total,
                    "classes_attended": present,
                })

        return Response({
            "status": "success",
            "data": {"threshold": threshold, "count": len(alerts), "alerts": alerts},
        })


class CourseAttendanceReportView(APIView):
    """GET /api/v1/attendance/report/{offering_id}/ — per-student breakdown for faculty."""

    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    @extend_schema(
        responses={200: inline_serializer("CourseReportResponse", {
            "status": serializers.CharField(),
            "data": serializers.DictField(),
        })},
        tags=["Attendance Analytics"],
    )
    def get(self, request, offering_id):
        from apps.academics.models import CourseOffering

        try:
            offering = CourseOffering.objects.select_related("course").get(pk=offering_id)
        except CourseOffering.DoesNotExist:
            return Response(
                {"detail": "Course offering not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        entry_ids = TimetableEntry.objects.filter(
            course_offering=offering, is_active=True
        ).values_list("id", flat=True)

        students = Enrollment.objects.filter(
            course_offering=offering, status="active"
        ).select_related("student")

        report = []
        for enr in students:
            records = AttendanceRecord.objects.filter(
                timetable_entry_id__in=entry_ids,
                student=enr.student,
            )
            total = records.count()
            present = records.filter(status__in=["present", "late"]).count()
            absent = records.filter(status="absent").count()
            late = records.filter(status="late").count()
            excused = records.filter(status="excused").count()
            pct = round(present / total * 100, 1) if total > 0 else 0

            report.append({
                "student_id": str(enr.student.id),
                "student_name": enr.student.full_name,
                "total_classes": total,
                "present": present,
                "absent": absent,
                "late": late,
                "excused": excused,
                "percentage": pct,
                "below_threshold": pct < 75,
            })

        report.sort(key=lambda x: x["percentage"])

        return Response({
            "status": "success",
            "data": {
                "course_name": offering.course.name,
                "course_code": offering.course.code,
                "total_students": len(report),
                "students_below_threshold": sum(1 for r in report if r["below_threshold"]),
                "report": report,
            },
        })


# ─── Room Bookings ──────────────────────────────────────────────────────


class RoomBookingListCreateView(generics.ListCreateAPIView):
    serializer_class = RoomBookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["room", "status", "date"]

    def get_queryset(self):
        return RoomBooking.objects.select_related("room", "booked_by", "approved_by").all()

    def perform_create(self, serializer):
        serializer.save(booked_by=self.request.user)


class RoomBookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoomBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RoomBooking.objects.select_related("room", "booked_by", "approved_by").all()


class RoomBookingApproveView(APIView):
    """PATCH /api/v1/timetable/room-bookings/{id}/approve/"""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @extend_schema(
        request=inline_serializer(
            name="RoomBookingApproval",
            fields={"status": serializers.ChoiceField(choices=["approved", "rejected"])},
        ),
        responses={200: RoomBookingSerializer},
    )
    def patch(self, request, pk):
        try:
            booking = RoomBooking.objects.get(pk=pk)
            status_val = request.data.get("status")
            if status_val not in ["approved", "rejected"]:
                return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
            
            booking.status = status_val
            booking.approved_by = request.user
            booking.save()
            return Response(RoomBookingSerializer(booking).data)
        except RoomBooking.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)


# ─── Substitute Faculty ──────────────────────────────────────────────────


class SubstituteFacultyListCreateView(generics.ListCreateAPIView):
    serializer_class = SubstituteFacultySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]
    filterset_fields = ["timetable_entry", "substitute", "date"]

    def get_queryset(self):
        return SubstituteFaculty.objects.select_related("timetable_entry", "substitute", "assigned_by").all()

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class SubstituteFacultyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubstituteFacultySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFaculty]

    def get_queryset(self):
        return SubstituteFaculty.objects.select_related("timetable_entry", "substitute", "assigned_by").all()


class ExportAttendanceView(APIView):
    """GET /api/v1/timetable/attendance/export/ — Export attendance as CSV."""
    
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: serializers.CharField(help_text="CSV file content")},
        tags=["Timetable"],
    )
    def get(self, request):
        if request.user.role == "student":
            records = AttendanceRecord.objects.filter(student=request.user).select_related("timetable_entry__course_offering__course")
        elif request.user.role in ("faculty", "dean", "head", "admin"):
            records = AttendanceRecord.objects.select_related("student", "timetable_entry__course_offering__course").all()
        else:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="attendance_export.csv"'

        writer = csv.writer(response)
        writer.writerow(["Student", "Course", "Date", "Status", "Remarks"])

        for record in records:
            writer.writerow([
                record.student.full_name,
                record.timetable_entry.course_offering.course.name,
                record.date,
                record.status,
                record.remarks or "",
            ])

        return response
