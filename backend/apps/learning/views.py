"""Learning views: enrolments, lesson player, progress and bookmarks."""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRoles
from apps.core.exceptions import APIError
from apps.courses.models import Course, CourseStatus, Lesson
from apps.learning.access import user_can_access_course_lessons
from apps.learning.models import Bookmark, Enrollment, LessonProgress
from apps.learning.serializers import BookmarkSerializer, EnrollmentSerializer


class MyEnrollmentListView(generics.ListAPIView):
    """GET /api/v1/my/enrollments/?status=in_progress|completed"""

    permission_classes = [IsAuthenticated]
    serializer_class = EnrollmentSerializer
    pagination_class = None

    def get_queryset(self):
        qs = (
            Enrollment.objects.filter(user=self.request.user)
            .select_related("course", "course__owner", "course__category")
        )
        state = self.request.query_params.get("status")
        if state == "completed":
            qs = qs.filter(completed_at__isnull=False)
        elif state == "in_progress":
            qs = qs.filter(completed_at__isnull=True)
        if search := self.request.query_params.get("search"):
            qs = qs.filter(course__title__icontains=search)
        return qs.order_by("-last_accessed_at", "-enrolled_at")


class CourseProgressView(APIView):
    """GET /api/v1/my/courses/<course_id>/progress/ — progress + completed lessons."""

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        enrollment = _get_enrollment_or_404(request.user, course_id)
        completed = list(
            LessonProgress.objects.filter(enrollment=enrollment).values_list("lesson_id", flat=True)
        )
        return Response(
            {
                "course_id": enrollment.course_id,
                "progress_percent": enrollment.progress_percent,
                "completed_lesson_ids": completed,
                "completed_at": enrollment.completed_at,
                "total_lessons": enrollment.course.lesson_count,
            }
        )


class CoursePlayerView(APIView):
    """GET /api/v1/my/courses/<course_id>/player/ — full curriculum with bodies.

    Access requires an active enrollment, course ownership or admin role.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = _get_course_or_404(course_id)
        if not user_can_access_course_lessons(request.user, course):
            raise APIError(
                status.HTTP_403_FORBIDDEN,
                "You do not have access to this course.",
                code="not_enrolled",
            )

        from apps.courses.serializers import CourseDetailSerializer, LessonDetailSerializer

        enrollment = Enrollment.objects.filter(user=request.user, course=course).first()
        if enrollment is not None:
            enrollment.last_accessed_at = timezone.now()
            enrollment.save(update_fields=["last_accessed_at"])

        completed = []
        if enrollment is not None:
            completed = list(
                LessonProgress.objects.filter(enrollment=enrollment).values_list("lesson_id", flat=True)
            )

        sections = []
        for section in course.sections.prefetch_related("lessons").all():
            sections.append(
                {
                    "id": section.id,
                    "title": section.title,
                    "summary": section.summary,
                    "order": section.order,
                    "lessons": LessonDetailSerializer(section.lessons.all(), many=True).data,
                }
            )

        course_payload = CourseDetailSerializer(course, context={"request": request}).data
        return Response(
            {
                "course": course_payload,
                "sections": sections,
                "completed_lesson_ids": completed,
                "progress_percent": enrollment.progress_percent if enrollment else 100,
                "enrollment_id": enrollment.id if enrollment else None,
            }
        )


class LessonCompleteView(APIView):
    """POST /api/v1/my/lessons/<lesson_id>/complete/ — idempotent."""

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, lesson_id):
        lesson = _get_lesson_or_404(lesson_id)
        course = lesson.section.course
        if not user_can_access_course_lessons(request.user, course):
            raise APIError(status.HTTP_403_FORBIDDEN, "You do not have access to this lesson.", code="not_enrolled")

        enrollment = Enrollment.objects.filter(user=request.user, course=course).first()
        if enrollment is None:
            # Course owners / admins may complete lessons without an enrollment
            # only if they are enrolled; otherwise there is no progress to track.
            raise APIError(status.HTTP_409_CONFLICT, "You are not enrolled in this course.", code="not_enrolled")

        completed = request.data.get("completed", True)
        if completed:
            LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
        else:
            LessonProgress.objects.filter(enrollment=enrollment, lesson=lesson).delete()

        percent = enrollment.recalculate_progress()

        certificate = None
        if percent >= 100:
            certificate = _issue_certificate_if_eligible(enrollment)

        return Response(
            {
                "lesson_id": lesson.id,
                "completed": bool(completed),
                "progress_percent": percent,
                "course_completed": percent >= 100,
                "certificate": certificate,
            }
        )


class BookmarkListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/my/bookmarks/"""

    permission_classes = [IsAuthenticated]
    serializer_class = BookmarkSerializer
    pagination_class = None

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user).select_related(
            "course", "course__owner", "course__category"
        )


class BookmarkDeleteView(generics.DestroyAPIView):
    """DELETE /api/v1/my/bookmarks/<course_id>/ (by course id)."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user)

    def get_object(self):
        course_id = self.kwargs["course_id"]
        bookmark = Bookmark.objects.filter(user=self.request.user, course_id=course_id).first()
        if bookmark is None:
            raise APIError(status.HTTP_404_NOT_FOUND, "Bookmark not found.", code="not_found")
        return bookmark


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _get_course_or_404(course_id):
    course = Course.objects.filter(pk=course_id).select_related("owner", "category").first()
    if course is None:
        raise APIError(status.HTTP_404_NOT_FOUND, "Course not found.", code="not_found")
    return course


def _get_lesson_or_404(lesson_id):
    lesson = Lesson.objects.filter(pk=lesson_id).select_related("section__course").first()
    if lesson is None:
        raise APIError(status.HTTP_404_NOT_FOUND, "Lesson not found.", code="not_found")
    return lesson


def _get_enrollment_or_404(user, course_id):
    enrollment = Enrollment.objects.filter(user=user, course_id=course_id).select_related("course").first()
    if enrollment is None:
        raise APIError(status.HTTP_404_NOT_FOUND, "You are not enrolled in this course.", code="not_enrolled")
    return enrollment


def _issue_certificate_if_eligible(enrollment):
    from apps.certificates.services import issue_certificate

    certificate = issue_certificate(enrollment)
    if certificate is None:
        return None
    return {
        "id": certificate.id,
        "code": certificate.code,
        "issued_at": certificate.issued_at,
    }


def _user_is_student(user) -> bool:
    return user.role == UserRoles.STUDENT
