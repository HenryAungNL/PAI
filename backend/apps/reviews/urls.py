from django.urls import path

from apps.reviews.views import (
    AdminReviewDeleteView,
    AdminReviewListView,
    AdminReviewModerateView,
    CourseReviewListView,
    MyCourseReviewView,
    ReviewReportView,
    ReviewUpdateDeleteView,
)

urlpatterns = [
    path("courses/<int:course_id>/reviews/", CourseReviewListView.as_view(), name="course-reviews"),
    path("courses/<int:course_id>/my-review/", MyCourseReviewView.as_view(), name="my-course-review"),
    path("reviews/<int:pk>/", ReviewUpdateDeleteView.as_view(), name="review-detail"),
    path("reviews/<int:pk>/report/", ReviewReportView.as_view(), name="review-report"),
    path("admin/reviews/", AdminReviewListView.as_view(), name="admin-reviews"),
    path("admin/reviews/<int:pk>/", AdminReviewModerateView.as_view(), name="admin-review-moderate"),
    path("admin/reviews/<int:pk>/delete/", AdminReviewDeleteView.as_view(), name="admin-review-delete"),
]
