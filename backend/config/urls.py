"""URL configuration for the PAI backend."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.core.health import HealthView

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
    path("django-admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.auth_urls")),
    path("api/v1/users/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.courses.urls")),
    path("api/v1/", include("apps.learning.urls")),
    path("api/v1/", include("apps.payments.urls")),
    path("api/v1/", include("apps.reviews.urls")),
    path("api/v1/", include("apps.certificates.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
    path("api/v1/admin/", include("apps.audit.urls")),
    path("api/v1/admin/", include("apps.analytics.admin_urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "PAI Administration"
admin.site.site_title = "PAI admin"
admin.site.index_title = "Emergency / development admin"
