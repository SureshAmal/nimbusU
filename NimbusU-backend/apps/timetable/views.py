"""Views for the timetable app."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import generics, permissions, serializers, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsAdminOrFaculty, IsFaculty
from apps.academics.models import Enrollment

from .models import AttendanceRecord, Room, TimetableEntry, TimetableSwapRequest, ClassCancellation
from .serializers import (
    AttendanceRecordSerializer,
    BulkAttendanceSerializer,
    RoomSerializer,
    TimetableEntrySerializer,
    TimetableSwapRequestSerializer,
    TimetableSwapCreateSerializer,
    ClassCancellationSerializer,
    ClassCancellationCreateSerializer,
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
