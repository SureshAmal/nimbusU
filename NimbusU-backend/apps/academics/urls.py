"""URL routing for the academics app."""

from django.urls import path

from . import views

app_name = "academics"

urlpatterns = [
    # Schools
    path("academics/schools/", views.SchoolListCreateView.as_view(), name="school-list-create"),
    path("academics/schools/<uuid:pk>/", views.SchoolDetailView.as_view(), name="school-detail"),
    # Departments
    path("departments/", views.DepartmentListCreateView.as_view(), name="department-list-create"),
    path("departments/<uuid:pk>/", views.DepartmentDetailView.as_view(), name="department-detail"),
    # Programs
    path("academics/programs/", views.ProgramListCreateView.as_view(), name="program-list-create"),
    path("academics/programs/<uuid:pk>/", views.ProgramDetailView.as_view(), name="program-detail"),
    # Semesters
    path("academics/semesters/", views.SemesterListCreateView.as_view(), name="semester-list-create"),
    path("academics/semesters/current/", views.CurrentSemesterView.as_view(), name="semester-current"),
    path("academics/semesters/<uuid:pk>/", views.SemesterDetailView.as_view(), name="semester-detail"),
    # Courses
    path("academics/courses/", views.CourseListCreateView.as_view(), name="course-list-create"),
    path("academics/courses/<uuid:pk>/", views.CourseDetailView.as_view(), name="course-detail"),
    # Course Offerings
    path("academics/offerings/", views.CourseOfferingListCreateView.as_view(), name="offering-list-create"),
    path("academics/offerings/<uuid:pk>/", views.CourseOfferingDetailView.as_view(), name="offering-detail"),
    path("academics/offerings/<uuid:pk>/students/", views.CourseOfferingStudentsView.as_view(), name="offering-students"),
    # Enrollments
    path("enrollments/", views.EnrollmentCreateView.as_view(), name="enrollment-create"),
    path("enrollments/bulk-create/", views.EnrollmentBulkCreateView.as_view(), name="enrollment-bulk-create"),
    path("enrollments/me/", views.MyEnrollmentsView.as_view(), name="my-enrollments"),
    path("enrollments/<uuid:pk>/", views.EnrollmentDeleteView.as_view(), name="enrollment-delete"),
    # Academic Calendar
    path("academics/calendar/", views.AcademicEventListCreateView.as_view(), name="calendar-list-create"),
    path("academics/calendar/<uuid:pk>/", views.AcademicEventDetailView.as_view(), name="calendar-detail"),
    # Course Prerequisites
    path("academics/prerequisites/", views.CoursePrerequisiteListCreateView.as_view(), name="prereq-list-create"),
    path("academics/prerequisites/<uuid:pk>/", views.CoursePrerequisiteDeleteView.as_view(), name="prereq-delete"),
    # Grades
    path("academics/grades/", views.GradeListCreateView.as_view(), name="grade-list-create"),
    path("academics/grades/export/", views.ExportGradesView.as_view(), name="grade-export"),
    path("academics/grades/me/", views.MyGradesView.as_view(), name="my-grades"),
    path("academics/grades/gpa/", views.GPAView.as_view(), name="gpa"),
    path("academics/grades/<uuid:pk>/", views.GradeDetailView.as_view(), name="grade-detail"),
]
