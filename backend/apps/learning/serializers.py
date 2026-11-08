"""Learning serializers: enrollments, progress and bookmarks."""
from rest_framework import serializers

from apps.courses.serializers import CourseListSerializer
from apps.learning.models import Bookmark, Enrollment, LessonProgress


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)
    student = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "course",
            "enrolled_at",
            "completed_at",
            "last_accessed_at",
            "progress_percent",
            "is_completed",
        ]

    def get_student(self, obj):
        user = obj.user
        if user is None:
            return None
        return {"id": user.id, "full_name": user.full_name, "email": user.email}


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ["id", "lesson", "completed_at"]


class BookmarkSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)
    course_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Bookmark
        fields = ["id", "course", "course_id", "created_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        from apps.courses.models import Course

        try:
            course = Course.objects.get(pk=validated_data["course_id"])
        except Course.DoesNotExist:
            raise serializers.ValidationError({"course_id": "Course not found."})
        bookmark, _ = Bookmark.objects.get_or_create(user=user, course=course)
        return bookmark
