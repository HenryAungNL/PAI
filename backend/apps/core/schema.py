"""drf-spectacular extensions so the OpenAPI schema documents the cookie JWT
authentication scheme cleanly."""
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "apps.accounts.authentication.CookieJWTAuthentication"
    name = "jwtAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": (
                "Short-lived access token returned by the login endpoint. "
                "Send it as `Authorization: Bearer <token>`. The long-lived "
                "refresh token is stored separately in an HttpOnly cookie."
            ),
        }
