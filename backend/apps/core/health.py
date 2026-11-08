"""Lightweight health check for container orchestration."""
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """GET /health — returns 200 when the app and database are reachable."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            db_ok = True
        except Exception:  # pragma: no cover - only hit when the DB is down
            db_ok = False
        payload = {"status": "ok" if db_ok else "degraded", "database": db_ok}
        return Response(payload, status=200 if db_ok else 503)
