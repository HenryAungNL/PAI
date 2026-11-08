from django.urls import path

from apps.analytics.views import (
    InstructorAnalyticsView,
    PublicSiteConfigView,
    PublicStatsView,
)

urlpatterns = [
    path("public/", PublicStatsView.as_view(), name="public-stats"),
    path("site-config/", PublicSiteConfigView.as_view(), name="site-config"),
    path("instructor/", InstructorAnalyticsView.as_view(), name="instructor-analytics"),
]
