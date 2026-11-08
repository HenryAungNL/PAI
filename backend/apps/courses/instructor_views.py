"""Public instructor directory endpoints."""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRoles
from apps.courses.models import Course, CourseStatus
from apps.courses.serializers import CourseListSerializer, _instructor_payload

User = get_user_model()


class InstructorListView(APIView):
    """GET /api/v1/instructors/ — public directory of approved instructors."""

    permission_classes = [AllowAny]

    def get(self, request):
        instructors = (
            User.objects.filter(role=UserRoles.INSTRUCTOR, is_approved=True)
            .annotate(course_count=Count("courses_taught", filter=Q(courses_taught__status=CourseStatus.PUBLISHED)))
            .filter(course_count__gt=0)
            .order_by("-course_count")
        )
        limit = request.query_params.get("limit")
        if limit and str(limit).isdigit():
            instructors = instructors[: int(limit)]
        data = []
        for instructor in instructors:
            payload = _instructor_payload(instructor, request)
            payload["course_count"] = instructor.course_count
            payload["student_count"] = Course.objects.filter(
                owner=instructor, status=CourseStatus.PUBLISHED
            ).aggregate(total=Count("enrollments"))["total"] or 0
            data.append(payload)
        return Response(data)


class InstructorDetailView(APIView):
    """GET /api/v1/instructors/<id>/ — instructor profile + published courses."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        instructor = User.objects.filter(pk=pk, role=UserRoles.INSTRUCTOR, is_approved=True).first()
        if instructor is None:
            return Response(
                {"error": {"code": "not_found", "message": "Instructor not found.", "details": {}}},
                status=404,
            )
        courses = (
            Course.objects.filter(owner=instructor, status=CourseStatus.PUBLISHED)
            .select_related("owner", "category")
            .order_by("-enrollment_count")
        )
        payload = _instructor_payload(instructor, request)
        payload["course_count"] = courses.count()
        payload["student_count"] = courses.aggregate(total=Count("enrollments"))["total"] or 0
        payload["courses"] = CourseListSerializer(courses, many=True, context={"request": request}).data
        return Response(payload)
