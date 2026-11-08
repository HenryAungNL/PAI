from rest_framework import generics

from apps.accounts.permissions import IsPlatformAdmin
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """GET /api/v1/admin/audit-logs/ — admin only."""

    permission_classes = [IsPlatformAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor")
        params = self.request.query_params
        if action := params.get("action"):
            qs = qs.filter(action__icontains=action)
        if object_type := params.get("object_type"):
            qs = qs.filter(object_type=object_type)
        if search := params.get("search"):
            qs = qs.filter(object_repr__icontains=search) | qs.filter(actor_email__icontains=search)
        return qs
