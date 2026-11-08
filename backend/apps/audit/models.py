from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Append-only record of sensitive administrative operations."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_events",
    )
    actor_email = models.CharField(max_length=254, blank=True)  # survives user deletion
    action = models.CharField(max_length=100)
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action"]),
            models.Index(fields=["object_type", "object_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} by {self.actor_email or 'system'}"
