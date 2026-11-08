"""
Django settings for the PAI backend.

All secrets come from environment variables; see backend/.env.example.
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
# Persistent data directory (SQLite DB + media) — mounted as a volume in Docker.
DATA_DIR = Path(os.environ.get("PAI_DATA_DIR", BASE_DIR / "data"))


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "insecure-development-key-change-me-before-production",
)
# Detect the test runner early so we can relax slow/rate-limited behaviour.
import sys  # noqa: E402

TESTING = "test" in sys.argv or os.environ.get("PAI_FAST_TESTS") == "1"
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # PAI apps
    "apps.core",
    "apps.accounts",
    "apps.courses",
    "apps.learning",
    "apps.payments",
    "apps.reviews",
    "apps.certificates",
    "apps.audit",
    "apps.analytics",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": DATA_DIR / "db.sqlite3",
        "OPTIONS": {
            # SQLite performs better under Docker with explicit timeout + WAL.
            "timeout": 20,
        },
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = DATA_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

MEDIA_URL = "/media/"
MEDIA_ROOT = DATA_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Speed up the test suite: use a fast, non-cryptographic password hasher only
# while running tests (never in production).
if TESTING:
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "240/min",
        "auth": "10/min",
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

if TESTING:
    # Throttling makes repeated auth requests in a single test flaky, so we
    # drop the global throttles and set generous auth rates (view-level
    # throttles are still instantiated and need a rate to exist).
    REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"anon": "100000/min", "user": "100000/min", "auth": "100000/min"}

SPECTACULAR_SETTINGS = {
    "TITLE": "PAI API",
    "DESCRIPTION": "REST API for PAI — a modern Learning Management System.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "EXTENSIONS": ["apps.core.schema.CookieJWTAuthenticationScheme"],
    "ENUM_NAME_OVERRIDES": {
        "UserRoleEnum": "apps.accounts.models.UserRoles",
        "CourseStatusEnum": "apps.courses.models.CourseStatus",
        "DifficultyEnum": "apps.courses.models.Difficulty",
        "OrderStatusEnum": "apps.payments.models.OrderStatus",
        "ReviewModerationStatusEnum": "apps.reviews.models.ReviewModerationStatus",
        "RefundStatusEnum": "apps.payments.models.RefundStatus",
    },
}

# ---------------------------------------------------------------------------
# JWT — short-lived access token (returned to JS, held in memory) plus a
# long-lived rotating refresh token stored in an HttpOnly cookie.
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

REFRESH_COOKIE_NAME = "pai_refresh"
REFRESH_COOKIE_HTTPONLY = True
REFRESH_COOKIE_SECURE = env_bool("COOKIE_SECURE", False)
REFRESH_COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "Lax")
REFRESH_COOKIE_PATH = "/api/v1/auth"
ACCESS_COOKIE_PATH = "/"

# ---------------------------------------------------------------------------
# CORS — the Vite dev server runs on a different origin.
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------
STRIPE_PUBLIC_KEY = os.environ.get("STRIPE_PUBLIC_KEY", "")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

SITE_URL = os.environ.get("SITE_URL", "http://localhost:5173")
PLATFORM_NAME = os.environ.get("PLATFORM_NAME", "PAI")
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "support@pai.example.com")

DEFAULT_CURRENCY = os.environ.get("DEFAULT_CURRENCY", "usd")

# ---------------------------------------------------------------------------
# Media / uploads
# ---------------------------------------------------------------------------
MAX_UPLOAD_SIZE_MB = int(os.environ.get("MAX_UPLOAD_SIZE_MB", "10"))
ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]

# ---------------------------------------------------------------------------
# Email — console backend during development.
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@pai.example.com")

# ---------------------------------------------------------------------------
# Logging — never log secrets, tokens or payment payloads.
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {"format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "standard"},
    },
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
    "loggers": {
        "django.request": {"level": "WARNING", "propagate": True},
    },
}

# ---------------------------------------------------------------------------
# Production hardening (activated when DJANGO_DEBUG=false)
# ---------------------------------------------------------------------------
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"
