"""Course views.

Public catalog (published only), instructor authoring views, and the
instructor-facing course workspace.
"""
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsInstructor, IsPlatformAdmin
from apps.audit.utils import log_event
from apps.core.exceptions import APIError
from apps.courses.models import Category, Course, CourseSection, CourseStatus, Lesson
from apps.courses.serializers import (
    CategorySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseSectionSerializer,
    LessonWriteSerializer,
)
from apps.courses.write_serializers import CourseWriteSerializer


class CategoryListView(generics.ListAPIView):
    """GET /api/v1/categories/ — public list of active categories."""

    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Category.objects.filter(is_active=True)
            .annotate(course_count=Count("courses", filter=Q(courses__status=CourseStatus.PUBLISHED)))
            .order_by("order", "name")
        )


class CourseListView(generics.ListAPIView):
    """GET /api/v1/courses/ — public, published-only catalog with filters."""

    permission_classes = [AllowAny]
    serializer_class = CourseListSerializer

    def get_queryset(self):
        qs = (
            Course.objects.filter(status=CourseStatus.PUBLISHED)
            .select_related("owner", "category")
            .prefetch_related("sections__lessons")
        )
        params = self.request.query_params

        if search := params.get("search"):
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(subtitle__icontains=search)
                | Q(description__icontains=search)
                | Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search)
                | Q(category__name__icontains=search)
            )
        if category := params.get("category"):
            qs = qs.filter(Q(category__slug=category) | Q(category__id=category if category.isdigit() else None))
        if difficulty := params.get("difficulty"):
            qs = qs.filter(difficulty=difficulty)
        if instructor := params.get("instructor"):
            qs = qs.filter(owner_id=instructor if str(instructor).isdigit() else None)

        price_max = params.get("price_max")
        if price_max is not None and str(price_max).isdigit():
            qs = qs.filter(price_cents__lte=int(price_max))
        min_rating = params.get("min_rating")
        if min_rating:
            try:
                qs = qs.filter(average_rating__gte=float(min_rating))
            except ValueError:
                pass
        if params.get("free") == "true":
            qs = qs.filter(price_cents=0)
        if params.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        sort = params.get("sort", "newest")
        sort_map = {
            "newest": "-published_at",
            "oldest": "published_at",
            "price_low": "price_cents",
            "price_high": "-price_cents",
            "rating": "-average_rating",
            "popular": "-enrollment_count",
            "title": "title",
        }
        return qs.order_by(sort_map.get(sort, "-published_at"))


class CourseDetailView(generics.RetrieveAPIView):
    """GET /api/v1/courses/<slug>/ — public detail for published courses.

    Non-published courses are only visible to the owner and administrators.
    """

    permission_classes = [AllowAny]
    serializer_class = CourseDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        qs = Course.objects.select_related("owner", "category").prefetch_related("sections__lessons")
        user = self.request.user
        if user.is_authenticated and (user.is_pai_admin or user.role == "instructor"):
            return qs.filter(Q(status=CourseStatus.PUBLISHED) | Q(owner=user))
        return qs.filter(status=CourseStatus.PUBLISHED)


class CourseOverviewListView(generics.ListAPIView):
    """GET /api/v1/courses/featured/ and /api/v1/courses/popular/ helper."""

    permission_classes = [AllowAny]
    serializer_class = CourseListSerializer

    def get_queryset(self):
        limit = 8
        return (
            Course.objects.filter(status=CourseStatus.PUBLISHED)
            .select_related("owner", "category")
            .order_by("-enrollment_count", "-average_rating")[:limit]
        )


# ---------------------------------------------------------------------------
# Instructor authoring
# ---------------------------------------------------------------------------
class InstructorCourseListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/instructor/courses/"""

    permission_classes = [IsAuthenticated, IsInstructor]

    def get_serializer_class(self):
        return CourseWriteSerializer if self.request.method == "POST" else CourseListSerializer

    def get_queryset(self):
        qs = (
            Course.objects.filter(owner=self.request.user)
            .select_related("category")
            .order_by("-updated_at")
        )
        if status_filter := self.request.query_params.get("status"):
            qs = qs.filter(status=status_filter)
        if search := self.request.query_params.get("search"):
            qs = qs.filter(title__icontains=search)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save(owner=request.user, status=CourseStatus.DRAFT)
        log_event(actor=request.user, action="course.created", obj=course, request=request)
        return Response(CourseDetailSerializer(course, context={"request": request}).data, status=status.HTTP_201_CREATED)


class InstructorCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/PUT/DELETE /api/v1/instructor/courses/<id>/"""

    permission_classes = [IsAuthenticated, IsInstructor]
    serializer_class = CourseWriteSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return Course.objects.filter(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        course = self.get_object()
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    def update(self, request, *args, **kwargs):
        course = self.get_object()
        serializer = self.get_serializer(course, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        course.recompute_aggregates()
        log_event(actor=request.user, action="course.updated", obj=course, request=request)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        course = self.get_object()
        if course.enrollments.exists():
            raise APIError(
                status.HTTP_409_CONFLICT,
                "This course has enrolled students and cannot be deleted. Archive it instead.",
                code="course_has_enrollments",
            )
        log_event(actor=request.user, action="course.deleted", obj=course, request=request)
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CourseSubmitForReviewView(APIView):
    """POST /api/v1/instructor/courses/<id>/submit/"""

    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, pk):
        course = get_object_or_404(Course, pk=pk, owner=request.user)
        if course.status not in {CourseStatus.DRAFT, CourseStatus.REJECTED}:
            raise APIError(status.HTTP_409_CONFLICT, "This course cannot be submitted in its current state.", code="invalid_status")
        if not course.sections.exists():
            raise APIError(status.HTTP_400_BAD_REQUEST, "Add at least one section and lesson before submitting.", code="course_incomplete")
        course.status = CourseStatus.PENDING
        course.moderation_note = ""
        course.save(update_fields=["status", "moderation_note", "updated_at"])
        log_event(actor=request.user, action="course.submitted_for_review", obj=course, request=request)
        return Response({"detail": "Course submitted for review.", "status": course.status})


class CourseArchiveView(APIView):
    """POST /api/v1/instructor/courses/<id>/archive/"""

    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, pk):
        course = get_object_or_404(Course, pk=pk, owner=request.user)
        course.status = CourseStatus.ARCHIVED
        course.save(update_fields=["status", "updated_at"])
        log_event(actor=request.user, action="course.archived", obj=course, request=request)
        return Response({"detail": "Course archived.", "status": course.status})


# ---------------------------------------------------------------------------
# Sections & lessons (nested authoring)
# ---------------------------------------------------------------------------
class SectionListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/instructor/courses/<course_id>/sections/"""

    permission_classes = [IsAuthenticated, IsInstructor]
    serializer_class = CourseSectionSerializer
    pagination_class = None

    def get_course(self):
        return get_object_or_404(Course, pk=self.kwargs["course_id"], owner=self.request.user)

    def get_queryset(self):
        return self.get_course().sections.prefetch_related("lessons")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["course"] = self.get_course()
        return ctx

    def perform_create(self, serializer):
        course = self.get_course()
        order = serializer.validated_data.get("order")
        if order is None:
            last = course.sections.order_by("-order").first()
            serializer.save(course=course, order=(last.order + 1) if last else 1)
        else:
            serializer.save(course=course)
        course.recompute_aggregates()


class SectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/instructor/sections/<id>/"""

    permission_classes = [IsAuthenticated, IsInstructor]
    serializer_class = CourseSectionSerializer

    def get_queryset(self):
        return CourseSection.objects.filter(course__owner=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["course"] = getattr(self.get_object(), "course", None) if self.request.method != "POST" else None
        return ctx


class LessonListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/instructor/sections/<section_id>/lessons/"""

    permission_classes = [IsAuthenticated, IsInstructor]
    serializer_class = LessonWriteSerializer
    pagination_class = None

    def get_section(self):
        return get_object_or_404(CourseSection, pk=self.kwargs["section_id"], course__owner=self.request.user)

    def get_queryset(self):
        return self.get_section().lessons.all()

    def perform_create(self, serializer):
        section = self.get_section()
        order = serializer.validated_data.get("order")
        if order is None:
            last = section.lessons.order_by("-order").first()
            serializer.save(section=section, order=(last.order + 1) if last else 1)
        else:
            serializer.save(section=section)
        section.course.recompute_aggregates()


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/instructor/lessons/<id>/"""

    permission_classes = [IsAuthenticated, IsInstructor]
    serializer_class = LessonWriteSerializer

    def get_queryset(self):
        return Lesson.objects.filter(section__course__owner=self.request.user)

    def perform_update(self, serializer):
        lesson = serializer.save()
        lesson.section.course.recompute_aggregates()

    def perform_destroy(self, instance):
        course = instance.section.course
        instance.delete()
        course.recompute_aggregates()


class PublicCoursePreviewView(generics.RetrieveAPIView):
    """GET /api/v1/courses/<slug>/preview/ — curriculum without premium bodies."""

    permission_classes = [AllowAny]
    serializer_class = CourseDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Course.objects.filter(status=CourseStatus.PUBLISHED).select_related("owner", "category")
