"""Authentication strategy

- Access tokens are short-lived JWTs handed to the client in the JSON body.
  The SPA keeps them in memory (never localStorage).
- Refresh tokens are rotated on every use and stored in an HttpOnly,
  SameSite cookie scoped to /api/v1/auth, so JavaScript cannot read them and
  cross-site request forgery against the refresh endpoint is mitigated by
  SameSite + the custom-header requirement on the auth endpoints.
"""
from django.conf import settings
from rest_framework.authentication import get_authorization_header
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken


def set_refresh_cookie(response, refresh_token: str):
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=settings.REFRESH_COOKIE_HTTPONLY,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response):
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def rotate_refresh_cookie(response, user):
    """Mint a new refresh token for `user`, blacklist the old one, set cookie."""
    refresh = RefreshToken.for_user(user)
    set_refresh_cookie(response, str(refresh.access_token.parent))
    return refresh


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate with a Bearer access token (the refresh cookie alone never
    authenticates a request — only the short-lived access token does)."""

    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if not header or header[0].lower() != b"bearer":
            return None
        if len(header) == 1:
            raise InvalidToken("Invalid token header. No credentials provided.")
        if len(header) > 2:
            raise InvalidToken("Invalid token header. Token string contains whitespace.")

        try:
            raw_token = header[1].decode("utf-8")
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError):
            raise
        return self.get_user(validated_token), validated_token
