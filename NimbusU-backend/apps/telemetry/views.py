"""Views for the telemetry app."""

from datetime import timedelta

from django.db.models import Avg, Count, F, Q
from django.db.models.functions import TruncHour
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from .models import RequestLog, SiteSettings
from .serializers import SiteSettingsSerializer


class TelemetryStatsView(APIView):
    """GET /api/v1/admin/telemetry/ — Aggregated telemetry statistics."""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @extend_schema(
        responses={200: inline_serializer("TelemetryStatsResponse", {
            "summary": serializers.DictField(),
            "requests_by_hour": serializers.ListField(),
            "top_endpoints": serializers.ListField(),
            "status_distribution": serializers.ListField(),
            "response_time_by_endpoint": serializers.ListField(),
            "top_users": serializers.ListField(),
            "recent_errors": serializers.ListField(),
            "endpoint_health": serializers.ListField(),
        })},
        tags=["Admin"],
    )
    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_1h = now - timedelta(hours=1)

        qs_24h = RequestLog.objects.filter(created_at__gte=last_24h)
        qs_1h = RequestLog.objects.filter(created_at__gte=last_1h)

        total_24h = qs_24h.count()
        total_1h = qs_1h.count()
        errors_24h = qs_24h.filter(status_code__gte=400).count()
        errors_1h = qs_1h.filter(status_code__gte=400).count()

        avg_response_24h = qs_24h.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
        avg_response_1h = qs_1h.aggregate(avg=Avg("response_time_ms"))["avg"] or 0

        unique_users_24h = qs_24h.filter(user__isnull=False).values("user").distinct().count()

        # Previous 24h for comparison
        prev_24h_start = last_24h - timedelta(hours=24)
        qs_prev = RequestLog.objects.filter(created_at__gte=prev_24h_start, created_at__lt=last_24h)
        total_prev = qs_prev.count()
        errors_prev = qs_prev.filter(status_code__gte=400).count()
        avg_prev = qs_prev.aggregate(avg=Avg("response_time_ms"))["avg"] or 0

        # Percentage changes
        def pct_change(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 1)

        error_rate_24h = round((errors_24h / total_24h * 100), 2) if total_24h > 0 else 0
        error_rate_prev = round((errors_prev / total_prev * 100), 2) if total_prev > 0 else 0

        summary = {
            "total_requests": total_24h,
            "requests_change": pct_change(total_24h, total_prev),
            "throughput_per_min": round(total_1h / 60, 1) if total_1h > 0 else 0,
            "avg_response_ms": round(avg_response_24h, 1),
            "latency_change": pct_change(avg_response_24h, avg_prev),
            "error_rate": error_rate_24h,
            "error_rate_change": pct_change(error_rate_24h, error_rate_prev),
            "unique_users": unique_users_24h,
        }

        # Requests per hour (last 24h)
        requests_by_hour = list(
            qs_24h
            .annotate(hour=TruncHour("created_at"))
            .values("hour")
            .annotate(
                total=Count("id"),
                errors=Count("id", filter=Q(status_code__gte=400)),
            )
            .order_by("hour")
        )

        # Top 10 endpoints
        top_endpoints = list(
            qs_24h
            .values("path")
            .annotate(
                count=Count("id"),
                avg_time=Avg("response_time_ms"),
                error_count=Count("id", filter=Q(status_code__gte=400)),
            )
            .order_by("-count")[:10]
        )

        # Status code distribution
        status_distribution = []
        for group, low, high in [("2xx", 200, 299), ("3xx", 300, 399), ("4xx", 400, 499), ("5xx", 500, 599)]:
            cnt = qs_24h.filter(status_code__gte=low, status_code__lte=high).count()
            if cnt > 0:
                status_distribution.append({"status_group": group, "count": cnt})

        # Avg response time by top endpoint
        response_time_by_endpoint = list(
            qs_24h
            .values("path")
            .annotate(avg_time=Avg("response_time_ms"), count=Count("id"))
            .order_by("-avg_time")[:10]
        )

        # Top 10 active users
        top_users = list(
            qs_24h
            .filter(user__isnull=False)
            .values("user__email", "user__first_name", "user__last_name")
            .annotate(request_count=Count("id"))
            .order_by("-request_count")[:10]
        )

        # Recent errors (last 20)
        recent_errors = list(
            qs_24h
            .filter(status_code__gte=400)
            .order_by("-created_at")[:20]
            .values("method", "path", "status_code", "response_time_ms", "user__email", "created_at")
        )

        # Endpoint health table (top 8 endpoints with health metrics)
        endpoint_health = []
        for ep in top_endpoints[:8]:
            ep_qs = qs_1h.filter(path=ep["path"])
            ep_total = ep_qs.count()
            ep_errors = ep_qs.filter(status_code__gte=400).count()
            ep_avg = ep_qs.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
            error_pct = (ep_errors / ep_total * 100) if ep_total > 0 else 0

            if error_pct > 10 or ep_avg > 500:
                health = "degraded"
            elif error_pct > 2 or ep_avg > 200:
                health = "warning"
            else:
                health = "healthy"

            # Sparkline data: last 6 hours, one point per hour
            sparkline = []
            for h in range(5, -1, -1):
                h_start = now - timedelta(hours=h + 1)
                h_end = now - timedelta(hours=h)
                h_avg = (
                    RequestLog.objects.filter(
                        path=ep["path"], created_at__gte=h_start, created_at__lt=h_end
                    ).aggregate(avg=Avg("response_time_ms"))["avg"] or 0
                )
                sparkline.append(round(h_avg, 1))

            endpoint_health.append({
                "path": ep["path"],
                "status": health,
                "latency_ms": round(ep_avg, 1),
                "errors": ep_errors,
                "sparkline": sparkline,
                "total_requests": ep_total,
            })

        # Hourly breakdown for charts (requests + errors + latency per hour)
        hourly_detail = list(
            qs_24h
            .annotate(hour=TruncHour("created_at"))
            .values("hour")
            .annotate(
                total=Count("id"),
                errors=Count("id", filter=Q(status_code__gte=400)),
                avg_latency=Avg("response_time_ms"),
                client_errors=Count("id", filter=Q(status_code__gte=400, status_code__lt=500)),
                server_errors=Count("id", filter=Q(status_code__gte=500)),
            )
            .order_by("hour")
        )

        return Response({
            "summary": summary,
            "requests_by_hour": requests_by_hour,
            "hourly_detail": hourly_detail,
            "top_endpoints": top_endpoints,
            "status_distribution": status_distribution,
            "response_time_by_endpoint": response_time_by_endpoint,
            "top_users": top_users,
            "recent_errors": recent_errors,
            "endpoint_health": endpoint_health,
        })


class SiteSettingsView(APIView):
    """GET/PATCH /api/v1/telemetry/site-settings/ — Global site settings."""

    permission_classes = [permissions.IsAuthenticated]

    # Only GET is allowed for non-admins, PATCH requires admin
    def get_permissions(self):
        if self.request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            return [permissions.IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    @extend_schema(
        responses={200: SiteSettingsSerializer},
        tags=["Admin"],
    )
    def get(self, request):
        settings = SiteSettings.load()
        serializer = SiteSettingsSerializer(settings)
        return Response(serializer.data)

    @extend_schema(
        request=SiteSettingsSerializer,
        responses={200: SiteSettingsSerializer},
        tags=["Admin"],
    )
    def patch(self, request):
        settings = SiteSettings.load()
        serializer = SiteSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
