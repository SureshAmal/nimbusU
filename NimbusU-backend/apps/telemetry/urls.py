"""URL routing for the telemetry app."""

from django.urls import path
from . import views

app_name = "telemetry"

urlpatterns = [
    path("admin/telemetry/", views.TelemetryStatsView.as_view(), name="telemetry-stats"),
    path("telemetry/site-settings/", views.SiteSettingsView.as_view(), name="site-settings"),
]
