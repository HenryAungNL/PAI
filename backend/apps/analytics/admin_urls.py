from django.urls import path

from apps.analytics.admin_views import (
    AdminCategoryDetailView,
    AdminCategoryListCreateView,
    AdminCourseDetailView,
    AdminCourseFeatureView,
    AdminCourseListView,
    AdminCourseModerateView,
    AdminEnrollmentListView,
    AdminInstructorApprovalView,
    AdminUserDetailView,
    AdminUserListView,
    AdminUserSuspendView,
)
from apps.analytics.views import AdminPlatformSettingsView, AdminStatsView

urlpatterns = [
    # Dashboard metrics & settings
    path("stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("settings/", AdminPlatformSettingsView.as_view(), name="admin-settings"),
    # Users
    path("users/", AdminUserListView.as_view(), name="admin-users"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("users/<int:pk>/suspend/", AdminUserSuspendView.as_view(), name="admin-user-suspend"),
    path("users/<int:pk>/approve-instructor/", AdminInstructorApprovalView.as_view(), name="admin-instructor-approve"),
    # Courses
    path("courses/", AdminCourseListView.as_view(), name="admin-courses"),
    path("courses/<int:pk>/", AdminCourseDetailView.as_view(), name="admin-course-detail"),
    path("courses/<int:pk>/moderate/", AdminCourseModerateView.as_view(), name="admin-course-moderate"),
    path("courses/<int:pk>/feature/", AdminCourseFeatureView.as_view(), name="admin-course-feature"),
    # Categories
    path("categories/", AdminCategoryListCreateView.as_view(), name="admin-categories"),
    path("categories/<int:pk>/", AdminCategoryDetailView.as_view(), name="admin-category-detail"),
    # Enrollments
    path("enrollments/", AdminEnrollmentListView.as_view(), name="admin-enrollments"),
]
