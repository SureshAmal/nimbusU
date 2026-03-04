"""URL routing for the timetable app."""

from django.urls import path

from . import views

app_name = "timetable"

urlpatterns = [
    # Rooms
    path("timetable/rooms/", views.RoomListCreateView.as_view(), name="room-list-create"),
    path("timetable/rooms/<uuid:pk>/", views.RoomDetailView.as_view(), name="room-detail"),
    # Timetable entries
    path("timetable/", views.TimetableListCreateView.as_view(), name="timetable-list-create"),
    path("timetable/me/", views.MyTimetableView.as_view(), name="my-timetable"),
    path("timetable/conflicts/", views.TimetableConflictsView.as_view(), name="timetable-conflicts"),
    path("timetable/<uuid:pk>/", views.TimetableDetailView.as_view(), name="timetable-detail"),
    # Swap requests
    path("timetable/swap-requests/", views.SwapRequestListCreateView.as_view(), name="swap-list-create"),
    path("timetable/swap-requests/<uuid:pk>/respond/", views.SwapRequestRespondView.as_view(), name="swap-respond"),
    # Class cancellations
    path("timetable/cancellations/", views.ClassCancellationListCreateView.as_view(), name="cancellation-list-create"),
    # Attendance
    path("attendance/mark/", views.BulkAttendanceView.as_view(), name="bulk-attendance"),
    path("attendance/export/", views.ExportAttendanceView.as_view(), name="attendance-export"),
    path("attendance/me/", views.MyAttendanceView.as_view(), name="my-attendance"),
    path("attendance/me/<uuid:offering_id>/", views.MyCourseAttendanceView.as_view(), name="my-course-attendance"),
    path("attendance/course/<uuid:offering_id>/", views.CourseAttendanceView.as_view(), name="course-attendance"),
    path("attendance/<uuid:pk>/", views.AttendanceEditView.as_view(), name="attendance-edit"),
    # Attendance Analytics
    path("attendance/summary/", views.AttendanceSummaryView.as_view(), name="attendance-summary"),
    path("attendance/low-alert/", views.LowAttendanceAlertView.as_view(), name="attendance-low-alert"),
    path("attendance/report/<uuid:offering_id>/", views.CourseAttendanceReportView.as_view(), name="attendance-report"),
    # Room Bookings
    path("room-bookings/", views.RoomBookingListCreateView.as_view(), name="room-booking-list-create"),
    path("room-bookings/<uuid:pk>/", views.RoomBookingDetailView.as_view(), name="room-booking-detail"),
    path("room-bookings/<uuid:pk>/approve/", views.RoomBookingApproveView.as_view(), name="room-booking-approve"),
    # Substitute Faculty
    path("substitute-faculty/", views.SubstituteFacultyListCreateView.as_view(), name="substitute-faculty-list-create"),
    path("substitute-faculty/<uuid:pk>/", views.SubstituteFacultyDetailView.as_view(), name="substitute-faculty-detail"),
]
