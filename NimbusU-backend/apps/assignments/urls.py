"""URL routing for the assignments app."""

from django.urls import path

from . import views

app_name = "assignments"

urlpatterns = [
    path("assignments/", views.AssignmentListCreateView.as_view(), name="assignment-list-create"),
    path("assignments/export/<uuid:offering_id>/", views.ExportGradesView.as_view(), name="export-grades"),
    path("assignments/<uuid:pk>/", views.AssignmentDetailView.as_view(), name="assignment-detail"),
    path("assignments/<uuid:pk>/submit/", views.SubmitWorkView.as_view(), name="submit-work"),
    path("assignments/<uuid:pk>/submissions/", views.AssignmentSubmissionsView.as_view(), name="assignment-submissions"),
    path("assignments/<uuid:pk>/submissions/me/", views.MySubmissionView.as_view(), name="my-submission"),
    path("assignments/<uuid:pk>/submissions/<uuid:sub_id>/grade/", views.GradeSubmissionView.as_view(), name="grade-submission"),
]
