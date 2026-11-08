from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_name",
            "actor_email",
            "action",
            "object_type",
            "object_id",
            "object_repr",
            "metadata",
            "ip_address",
            "created_at",
        ]

    def get_actor_name(self, obj):
        if obj.actor and obj.actor.full_name:
            return obj.actor.full_name
        return obj.actor_email or "System"
