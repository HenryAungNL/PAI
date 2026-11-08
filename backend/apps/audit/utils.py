"""Helpers for writing audit events without leaking sensitive data."""
from __future__ import annotations

import logging

from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)

# Keys that must never be persisted in audit metadata.
_SENSITIVE_KEYS = {"password", "token", "secret", "authorization", "card", "cvc", "client_secret"}


def _sanitize(payload: dict | None) -> dict:
    if not payload:
        return {}
    clean: dict = {}
    for key, value in payload.items():
        if any(marker in key.lower() for marker in _SENSITIVE_KEYS):
            clean[key] = "[redacted]"
        elif isinstance(value, dict):
            clean[key] = _sanitize(value)
        elif isinstance(value, (list, tuple)):
            clean[key] = [
                _sanitize(v) if isinstance(v, dict) else v for v in value
            ]
        elif isinstance(value, (str, int, float, bool)) or value is None:
            clean[key] = value
        else:
            clean[key] = str(value)
    return clean


def log_event(
    *,
    actor=None,
    action: str,
    obj=None,
    object_type: str = "",
    object_id: str = "",
    object_repr: str = "",
    metadata: dict | None = None,
    request=None,
) -> AuditLog:
    if obj is not None:
        object_type = object_type or obj.__class__.__name__
        object_id = object_id or str(getattr(obj, "pk", ""))
        object_repr = object_repr or str(obj)[:255]

    ip = None
    if request is not None:
        ip = _client_ip(request)

    try:
        return AuditLog.objects.create(
            actor=actor if getattr(actor, "is_authenticated", False) else None,
            actor_email=getattr(actor, "email", "") or "",
            action=action,
            object_type=object_type,
            object_id=object_id,
            object_repr=object_repr,
            metadata=_sanitize(metadata),
            ip_address=ip,
        )
    except Exception:  # never let audit logging break the request
        logger.exception("Failed to write audit event %s", action)
        return AuditLog()  # unsaved placeholder


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
