"""Uniform API error responses.

Every error the API returns has the shape:

    { "error": { "code": "...", "message": "...", "details": {...} } }

DRF's default validation errors are wrapped into the same envelope so the
frontend only needs a single error-parsing helper.
"""
import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

# Code used when the underlying exception doesn't carry one.
DEFAULT_CODES = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "not_authenticated",
    status.HTTP_403_FORBIDDEN: "permission_denied",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_429_TOO_MANY_REQUESTS: "throttled",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "server_error",
}


def _code_for(exc: Exception, response: Response) -> str:
    if isinstance(exc, exceptions.ValidationError):
        return "validation_error"
    if isinstance(exc, exceptions.AuthenticationFailed):
        return "invalid_credentials"
    if isinstance(exc, exceptions.NotAuthenticated):
        return "not_authenticated"
    if isinstance(exc, exceptions.PermissionDenied) or isinstance(exc, DjangoPermissionDenied):
        return "permission_denied"
    if isinstance(exc, Http404):
        return "not_found"
    if isinstance(exc, exceptions.Throttled):
        return "throttled"
    code = getattr(exc, "code", None)
    return code or DEFAULT_CODES.get(response.status_code, "error")


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        # Unhandled server-side exception — log without leaking details.
        logger.exception("Unhandled API exception during %s", context.get("view"))
        return Response(
            {
                "error": {
                    "code": "server_error",
                    "message": "An unexpected error occurred. Please try again.",
                    "details": {},
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = _code_for(exc, response)

    if isinstance(exc, APIError):
        response.data = {
            "error": {"code": exc.code, "message": exc.message, "details": exc.details}
        }
        return response

    if isinstance(response.data, dict) and "error" in response.data and isinstance(
        response.data["error"], dict
    ):
        payload = response.data
    elif isinstance(response.data, dict) and set(response.data.keys()) <= {
        "detail",
        "details",
        "non_field_errors",
    }:
        # Standard DRF shape: {"detail": "..."} or {"detail": "...", ...}
        message = response.data.get("detail", "Request failed.")
        details = {k: v for k, v in response.data.items() if k != "detail"}
        payload = {"error": {"code": code, "message": str(message), "details": details}}
    else:
        # Field validation errors.
        message = "The submitted data was invalid."
        payload = {"error": {"code": code, "message": message, "details": response.data}}

    response.data = payload
    return response


class APIError(exceptions.APIException):
    """Raise a structured API error from anywhere: raise APIError(403, 'nope')."""

    def __init__(self, status_code: int, message: str, code: str | None = None, details: dict | None = None):
        self.status_code = status_code
        self.message = message
        self.code = code or DEFAULT_CODES.get(status_code, "error")
        self.details = details or {}
        super().__init__(detail=message, code=self.code)

    def to_response(self) -> Response:
        return Response(
            {"error": {"code": self.code, "message": self.message, "details": self.details}},
            status=self.status_code,
        )
