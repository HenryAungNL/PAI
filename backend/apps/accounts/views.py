"""Authentication and account views."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.accounts.authentication import clear_refresh_cookie, set_refresh_cookie
from apps.accounts.serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
    build_password_reset_token,
    build_password_reset_uid,
)
from apps.audit.utils import log_event
from apps.core.exceptions import APIError
from apps.core.throttling import AuthRateThrottle

User = get_user_model()


def _token_payload(user, access: str) -> dict:
    return {
        "access": access,
        "user": UserSerializer(user, context={"request": None}).data,
    }


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/"""

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(refresh.access_token),
                "user": UserSerializer(user, context={"request": request}).data,
                "detail": "Account created successfully.",
            },
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, str(refresh))
        log_event(actor=user, action="user.registered", obj=user, request=request)
        return response


class LoginView(APIView):
    """POST /api/v1/auth/login/ — sets an HttpOnly refresh cookie."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(refresh.access_token),
                "user": UserSerializer(user, context={"request": request}).data,
            }
        )
        set_refresh_cookie(response, str(refresh))
        log_event(actor=user, action="user.login", obj=user, request=request)
        return response


class RefreshView(APIView):
    """POST /api/v1/auth/refresh/ — rotates the refresh cookie.

    The refresh token lives in an HttpOnly cookie. To mitigate CSRF we require
    a custom header (`X-Requested-With`), which browsers will not attach to a
    cross-site form submission, and the cookie is SameSite.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        if request.headers.get("X-Requested-With", "").lower() != "xmlhttprequest":
            raise APIError(status.HTTP_403_FORBIDDEN, "Missing required request header.", code="csrf_protection")

        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not raw:
            raise APIError(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again.", code="no_refresh_token")

        try:
            refresh = RefreshToken(raw)
            user = User.objects.get(pk=refresh["user_id"])
        except TokenError:
            raise APIError(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again.", code="invalid_token")
        except User.DoesNotExist:
            raise APIError(status.HTTP_401_UNAUTHORIZED, "Account not found.", code="invalid_token")

        if user.is_suspended or not user.is_active:
            raise APIError(status.HTTP_403_FORBIDDEN, "This account is not active.", code="account_inactive")

        # Rotate: blacklist the old token, issue a new refresh cookie.
        try:
            refresh.blacklist()
        except AttributeError:
            pass
        new_refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(new_refresh.access_token),
                "user": UserSerializer(user, context={"request": request}).data,
            }
        )
        set_refresh_cookie(response, str(new_refresh))
        return response


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — blacklists the refresh token."""

    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response({"detail": "Signed out."})
        clear_refresh_cookie(response)
        return response


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password-reset/ — always returns 200 to avoid user enumeration."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email=email, is_active=True).first()

        if user is not None:
            uid = build_password_reset_uid(user)
            token = build_password_reset_token(user)
            reset_url = f"{settings.SITE_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject="Reset your PAI password",
                message=(
                    "We received a request to reset your PAI password.\n\n"
                    f"Reset your password: {reset_url}\n\n"
                    "If you did not request this, you can safely ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            log_event(action="user.password_reset_requested", obj=user, actor=user, request=request)

        return Response(
            {"detail": "If an account exists for that email, a reset link has been sent."}
        )


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password-reset/confirm/"""

    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Invalidate all outstanding refresh tokens after a password change.
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)
        log_event(action="user.password_reset_completed", obj=user, actor=user, request=request)
        return Response({"detail": "Your password has been reset. You can now sign in."})


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/users/me/"""

    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ProfileUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(instance, context={"request": request}).data)


class PasswordChangeView(APIView):
    """POST /api/v1/users/me/password/"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_event(actor=request.user, action="user.password_changed", obj=request.user, request=request)
        return Response({"detail": "Your password has been updated."})
