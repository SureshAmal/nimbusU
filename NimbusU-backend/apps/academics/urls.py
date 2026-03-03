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
    path("academics/enrollments/", views.EnrollmentCreateView.as_view(), name="enrollment-create"),
    path("academics/enrollments/me/", views.MyEnrollmentsView.as_view(), name="my-enrollments"),
    path("academics/enrollments/<uuid:pk>/", views.EnrollmentDeleteView.as_view(), name="enrollment-delete"),
]
