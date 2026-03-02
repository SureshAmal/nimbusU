"""Main URL configuration for the NimbusU project."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.utils import extend_schema, inline_serializer
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView


class APIRootView(APIView):
    """API root — health check and endpoint overview."""

    permission_classes = []

    @extend_schema(
        responses={200: inline_serializer("APIRootResponse", {
            "status": serializers.CharField(),
            "message": serializers.CharField(),
            "endpoints": serializers.DictField(),
            "docs": serializers.DictField(),
        })},
        tags=["Root"],
    )
    def get(self, request):
        return Response({
            "status": "success",
            "message": "NimbusU API v1",
            "endpoints": {
                "auth": "/api/v1/auth/",
                "users": "/api/v1/users/",
                "departments": "/api/v1/departments/",
                "academics": "/api/v1/academics/",
                "content": "/api/v1/content/",
                "assignments": "/api/v1/assignments/",
                "timetable": "/api/v1/timetable/",
                "attendance": "/api/v1/attendance/",
                "communications": "/api/v1/communications/",
                "notifications": "/api/v1/notifications/",
            },
            "docs": {
                "swagger": "/api/docs/",
                "redoc": "/api/redoc/",
                "schema": "/api/schema/",
            },
        })


urlpatterns = [
    path("admin/", admin.site.urls),
    # OpenAPI schema & docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API v1
    path("api/v1/", APIRootView.as_view(), name="api-root"),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.academics.urls")),
    path("api/v1/", include("apps.content.urls")),
    path("api/v1/", include("apps.assignments.urls")),
    path("api/v1/", include("apps.timetable.urls")),
    path("api/v1/", include("apps.communications.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
