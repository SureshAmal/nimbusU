"""Views for the timetable app."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsAdminOrFaculty, IsFaculty
from apps.academics.models import Enrollment

from .models import AttendanceRecord, Room, TimetableEntry
from .serializers import (
    AttendanceRecordSerializer,
    BulkAttendanceSerializer,
    RoomSerializer,
    TimetableEntrySerializer,
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
    filterset_fields = ["semester", "day_of_week", "room", "is_active"]

    def get_queryset(self):
        qs = TimetableEntry.objects.select_related(
            "course_offering__course",
            "course_offering__faculty",
            "room",
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
            "room",
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
            "room",
        ).filter(is_active=True)

        if user.role == "faculty":
            return qs.filter(course_offering__faculty=user)
        elif user.role == "student":
            offering_ids = Enrollment.objects.filter(
                student=user, status="active"
            ).values_list("course_offering_id", flat=True)
            return qs.filter(course_offering_id__in=offering_ids)
        return qs.none()


class TimetableConflictsView(APIView):
    """GET /api/v1/timetable/conflicts/ — check room/faculty conflicts."""

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
            "course_offering__course", "course_offering__faculty", "room"
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
                    if a.room_id == b.room_id:
                        conflicts.append({
                            "type": "room",
                            "room": str(a.room),
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
