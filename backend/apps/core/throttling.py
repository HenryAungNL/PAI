from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Stricter throttle for login / register / password-reset endpoints."""

    scope = "auth"
