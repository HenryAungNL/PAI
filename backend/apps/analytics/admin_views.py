"""Custom admin dashboard endpoints (users, course moderation, categories,
enrollments). All endpoints require the platform-admin role — the React UI
hiding a control is never the authorization boundary.
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRoles
from apps.accounts.permissions import IsPlatformAdmin
from apps.analytics.serializers import AdminUserSerializer, AdminUserUpdateSerializer
from apps.audit.utils import log_event
from apps.core.exceptions import APIError
from apps.courses.models import Category, Course, CourseStatus
from apps.courses.serializers import CategorySerializer, CourseDetailSerializer, CourseListSerializer
from apps.learning.models import Enrollment
from apps.learning.serializers import EnrollmentSerializer

User = get_user_model()


class AdminUserListView(generics.ListAPIView):
    """GET /api/v1/admin/users/ — search, filter by role/status."""

    permission_classes = [IsPlatformAdmin]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by("-created_at")
        params = self.request.query_params
        if role := params.get("role"):
            qs = qs.filter(role=role)
        if params.get("status") == "suspended":
            qs = qs.filter(is_suspended=True)
        elif params.get("status") == "active":
            qs = qs.filter(is_active=True, is_suspended=False)
        elif params.get("status") == "inactive":
            qs = qs.filter(is_active=False)
        if params.get("pending_instructors") == "true":
            qs = qs.filter(role=UserRoles.INSTRUCTOR, is_approved=False)
        if search := params.get("search"):
            qs = qs.filter(
                Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        return qs


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/admin/users/<pk>/ — update role & status."""

    permission_classes = [IsPlatformAdmin]
    queryset = User.objects.all()

    def get_serializer_class(self):
        return AdminUserUpdateSerializer if self.request.method in {"PATCH", "PUT"} else AdminUserSerializer

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user and "role" in request.data and request.data["role"] != UserRoles.ADMIN:
            raise APIError(status.HTTP_400_BAD_REQUEST, "You cannot remove your own administrator role.", code="invalid_action")

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_event(
            actor=request.user,
            action="user.updated_by_admin",
            obj=user,
            metadata={"fields": list(request.data.keys())},
            request=request,
        )
        return Response(AdminUserSerializer(user, context={"request": request}).data)


class AdminUserSuspendView(APIView):
    """POST /api/v1/admin/users/<pk>/suspend/"""

    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            raise APIError(status.HTTP_400_BAD_REQUEST, "You cannot suspend your own account.", code="invalid_action")
        suspend = bool(request.data.get("suspend", True))
        user.is_suspended = suspend
        user.suspension_reason = str(request.data.get("reason", ""))[:500] if suspend else ""
        user.save(update_fields=["is_suspended", "suspension_reason"])
        log_event(
            actor=request.user,
            action="user.suspended" if suspend else "user.reactivated",
            obj=user,
            metadata={"reason": user.suspension_reason},
            request=request,
        )
        return Response(AdminUserSerializer(user, context={"request": request}).data)


class AdminInstructorApprovalView(APIView):
    """POST /api/v1/admin/users/<pk>/approve-instructor/"""

    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user.role != UserRoles.INSTRUCTOR:
            raise APIError(status.HTTP_400_BAD_REQUEST, "This user is not an instructor.", code="invalid_action")
        approve = bool(request.data.get("approve", True))
        user.is_approved = approve
        user.save(update_fields=["is_approved"])
        log_event(
            actor=request.user,
            action="instructor.approved" if approve else "instructor.unapproved",
            obj=user,
            request=request,
        )
        return Response(AdminUserSerializer(user, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Course moderation
# ---------------------------------------------------------------------------
class AdminCourseListView(generics.ListAPIView):
    """GET /api/v1/admin/courses/?status=pending"""

    permission_classes = [IsPlatformAdmin]
    serializer_class = CourseListSerializer

    def get_queryset(self):
        qs = Course.objects.select_related("owner", "category").prefetch_related("sections__lessons")
        params = self.request.query_params
        if status_filter := params.get("status"):
            qs = qs.filter(status=status_filter)
        if category := params.get("category"):
            qs = qs.filter(Q(category__slug=category) | Q(category__id=category if str(category).isdigit() else None))
        if search := params.get("search"):
            qs = qs.filter(Q(title__icontains=search) | Q(owner__email__icontains=search))
        return qs.order_by("-updated_at")


class AdminCourseDetailView(generics.RetrieveAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = CourseDetailSerializer
    queryset = Course.objects.select_related("owner", "category").prefetch_related("sections__lessons")


class AdminCourseModerateView(APIView):
    """POST /api/v1/admin/courses/<pk>/moderate/ {action: approve|reject|archive|restore, note}"""

    permission_classes = [IsPlatformAdmin]

    ACTION_MAP = {
        "approve": (CourseStatus.PUBLISHED, "course.approved"),
        "reject": (CourseStatus.REJECTED, "course.rejected"),
        "archive": (CourseStatus.ARCHIVED, "course.archived_by_admin"),
        "restore": (CourseStatus.DRAFT, "course.restored_to_draft"),
    }

    def post(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        action = request.data.get("action")
        if action not in self.ACTION_MAP:
            raise APIError(status.HTTP_400_BAD_REQUEST, "Unknown moderation action.", code="invalid_action")
        new_status, audit_action = self.ACTION_MAP[action]
        course.status = new_status
        course.moderation_note = str(request.data.get("note", ""))[:1000]
        if new_status == CourseStatus.PUBLISHED:
            course.published_at = course.published_at or __import__("django.utils.timezone", fromlist=["now"]).now()
        course.save(update_fields=["status", "moderation_note", "published_at", "updated_at"])
        log_event(
            actor=request.user,
            action=audit_action,
            obj=course,
            metadata={"note": course.moderation_note},
            request=request,
        )
        return Response(CourseDetailSerializer(course, context={"request": request}).data)


class AdminCourseFeatureView(APIView):
    """POST /api/v1/admin/courses/<pk>/feature/ {featured: bool}"""

    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        course.is_featured = bool(request.data.get("featured", True))
        course.save(update_fields=["is_featured", "updated_at"])
        log_event(actor=request.user, action="course.featured", obj=course, metadata={"featured": course.is_featured}, request=request)
        return Response({"id": course.id, "is_featured": course.is_featured})


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/admin/categories/"""

    permission_classes = [IsPlatformAdmin]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(course_count=Count("courses")).order_by("order", "name")

    def perform_create(self, serializer):
        category = serializer.save()
        log_event(actor=self.request.user, action="category.created", obj=category, request=self.request)


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/admin/categories/<pk>/"""

    permission_classes = [IsPlatformAdmin]
    serializer_class = CategorySerializer
    queryset = Category.objects.all()

    def perform_update(self, serializer):
        category = serializer.save()
        log_event(actor=self.request.user, action="category.updated", obj=category, request=self.request)

    def perform_destroy(self, instance):
        if instance.courses.exists():
            raise APIError(
                status.HTTP_409_CONFLICT,
                "This category still has courses. Reassign them first.",
                code="category_in_use",
            )
        log_event(actor=self.request.user, action="category.deleted", obj=instance, request=self.request)
        instance.delete()


# ---------------------------------------------------------------------------
# Enrollments
# ---------------------------------------------------------------------------
class AdminEnrollmentListView(generics.ListAPIView):
    """GET /api/v1/admin/enrollments/"""

    permission_classes = [IsPlatformAdmin]
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        qs = Enrollment.objects.select_related("user", "course", "course__owner", "course__category")
        params = self.request.query_params
        if course_id := params.get("course"):
            qs = qs.filter(course_id=course_id)
        if params.get("status") == "completed":
            qs = qs.filter(completed_at__isnull=False)
        elif params.get("status") == "in_progress":
            qs = qs.filter(completed_at__isnull=True)
        if search := params.get("search"):
            qs = qs.filter(Q(user__email__icontains=search) | Q(course__title__icontains=search))
        return qs
