"""Review views."""
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPlatformAdmin
from apps.audit.utils import log_event
from apps.core.exceptions import APIError
from apps.courses.models import Course
from apps.learning.models import Enrollment
from apps.reviews.models import Review, ReviewModerationStatus
from apps.reviews.serializers import (
    ReviewCreateSerializer,
    ReviewModerationSerializer,
    ReviewSerializer,
)
from apps.reviews.services import recompute_course_rating


class CourseReviewListView(generics.ListAPIView):
    """GET /api/v1/courses/<course_id>/reviews/ — public, visible reviews only."""

    permission_classes = [AllowAny]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return (
            Review.objects.filter(
                course_id=self.kwargs["course_id"], moderation_status=ReviewModerationStatus.VISIBLE
            )
            .select_related("user")
            .order_by("-created_at")
        )


class MyCourseReviewView(APIView):
    """GET/POST /api/v1/courses/<course_id>/my-review/

    Students may submit one review per course, and only if enrolled.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        review = Review.objects.filter(course_id=course_id, user=request.user).first()
        if review is None:
            return Response({"review": None})
        return Response({"review": ReviewSerializer(review).data})

    def post(self, request, course_id):
        course = Course.objects.filter(pk=course_id).first()
        if course is None:
            raise APIError(status.HTTP_404_NOT_FOUND, "Course not found.", code="not_found")
        if not Enrollment.objects.filter(user=request.user, course=course).exists():
            raise APIError(
                status.HTTP_403_FORBIDDEN,
                "Only enrolled students can review this course.",
                code="not_enrolled",
            )
        if Review.objects.filter(course=course, user=request.user).exists():
            raise APIError(
                status.HTTP_409_CONFLICT,
                "You have already reviewed this course.",
                code="review_exists",
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = Review.objects.create(course=course, user=request.user, **serializer.validated_data)
        recompute_course_rating(course)
        log_event(actor=request.user, action="review.created", obj=review, request=request)
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /api/v1/reviews/<pk>/ — the author editing their review."""

    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        review = self.get_object()
        serializer = ReviewCreateSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        recompute_course_rating(review.course)
        return Response(ReviewSerializer(review).data)

    def perform_destroy(self, instance):
        course = instance.course
        instance.delete()
        recompute_course_rating(course)


class ReviewReportView(APIView):
    """POST /api/v1/reviews/<pk>/report/ — flag a review for moderation."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = Review.objects.filter(pk=pk).first()
        if review is None:
            raise APIError(status.HTTP_404_NOT_FOUND, "Review not found.", code="not_found")
        if review.user_id == request.user.id:
            raise APIError(status.HTTP_400_BAD_REQUEST, "You cannot report your own review.", code="invalid_action")
        review.is_reported = True
        review.report_reason = str(request.data.get("reason", ""))[:255]
        review.save(update_fields=["is_reported", "report_reason", "updated_at"])
        log_event(actor=request.user, action="review.reported", obj=review, request=request)
        return Response({"detail": "Thank you — this review has been reported for moderation."})


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminReviewListView(generics.ListAPIView):
    """GET /api/v1/admin/reviews/ — all reviews, filterable by status/reported."""

    permission_classes = [IsPlatformAdmin]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related("user", "course")
        params = self.request.query_params
        if params.get("reported") == "true":
            qs = qs.filter(is_reported=True)
        if status_filter := params.get("status"):
            qs = qs.filter(moderation_status=status_filter)
        if search := params.get("search"):
            qs = qs.filter(Q(course__title__icontains=search) | Q(user__email__icontains=search) | Q(body__icontains=search))
        return qs


class AdminReviewModerateView(generics.UpdateAPIView):
    """PATCH /api/v1/admin/reviews/<pk>/ — hide / restore / clear reports."""

    permission_classes = [IsPlatformAdmin]
    serializer_class = ReviewModerationSerializer
    queryset = Review.objects.all()

    def update(self, request, *args, **kwargs):
        review = self.get_object()
        serializer = self.get_serializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if request.data.get("clear_report"):
            review.is_reported = False
            review.report_reason = ""
            review.save(update_fields=["is_reported", "report_reason"])
        recompute_course_rating(review.course)
        log_event(
            actor=request.user,
            action="review.moderated",
            obj=review,
            metadata={"moderation_status": review.moderation_status},
            request=request,
        )
        return Response(ReviewSerializer(review).data)


class AdminReviewDeleteView(generics.DestroyAPIView):
    """DELETE /api/v1/admin/reviews/<pk>/"""

    permission_classes = [IsPlatformAdmin]
    queryset = Review.objects.all()

    def perform_destroy(self, instance):
        course = instance.course
        log_event(actor=self.request.user, action="review.deleted", obj=instance, request=self.request)
        instance.delete()
        recompute_course_rating(course)
