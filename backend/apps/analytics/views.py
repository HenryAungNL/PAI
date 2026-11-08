"""Analytics and site-configuration views."""
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsInstructor, IsPlatformAdmin
from apps.analytics.models import PlatformSettings
from apps.analytics.serializers import PublicSiteConfigSerializer, PlatformSettingsSerializer
from apps.analytics.services import (
    enrollment_trend,
    instructor_stats,
    platform_stats,
    public_stats,
    recent_activity,
    revenue_trend,
)


class PublicStatsView(APIView):
    """GET /api/v1/analytics/public/ — real homepage trust indicators."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        return Response(public_stats())


class PublicSiteConfigView(APIView):
    """GET /api/v1/analytics/site-config/ — contact info, social links, policies."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        return Response(PublicSiteConfigSerializer(PlatformSettings.load()).data)


class InstructorAnalyticsView(APIView):
    """GET /api/v1/analytics/instructor/ — scoped to the requesting instructor."""

    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request):
        payload = instructor_stats(request.user)
        payload["enrollment_trend"] = enrollment_trend()
        payload["revenue_trend"] = revenue_trend()
        return Response(payload)


class AdminStatsView(APIView):
    """GET /api/v1/admin/stats/ — real platform aggregates."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        payload = platform_stats()
        payload.update(recent_activity())
        payload["enrollment_trend"] = enrollment_trend()
        payload["revenue_trend"] = revenue_trend()
        return Response(payload)


class AdminPlatformSettingsView(APIView):
    """GET/PATCH /api/v1/admin/settings/ — platform configuration."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        return Response(PlatformSettingsSerializer(PlatformSettings.load()).data)

    def patch(self, request):
        instance = PlatformSettings.load()
        serializer = PlatformSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        from apps.audit.utils import log_event

        log_event(actor=request.user, action="settings.updated", object_type="PlatformSettings", object_id="1", request=request)
        return Response(PlatformSettingsSerializer(instance).data)
