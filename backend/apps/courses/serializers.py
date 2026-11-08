"""Course serializers.

Two lesson shapes exist:
- LessonSummarySerializer: metadata only, safe to expose publicly.
- LessonDetailSerializer: includes content/video; only returned to users who
  are allowed to consume the lesson (preview, enrolled, owner or admin).
"""
from rest_framework import serializers

from apps.accounts.serializers import PublicUserSerializer
from apps.courses.models import Category, Course, CourseSection, Difficulty, Lesson


class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "image_url", "is_active", "order", "course_count"]


class InstructorBriefSerializer(serializers.Serializer):
    """Compact instructor card used on course listings."""

    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    headline = serializers.CharField(allow_blank=True)
    bio = serializers.CharField(allow_blank=True)
    avatar = serializers.CharField(allow_null=True, allow_blank=True)
    course_count = serializers.IntegerField(required=False)
    student_count = serializers.IntegerField(required=False)


class LessonSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ["id", "title", "description", "duration_minutes", "order", "is_preview"]


class LessonDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "description",
            "content",
            "video_url",
            "attachment",
            "duration_minutes",
            "order",
            "is_preview",
        ]


class LessonWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "description",
            "content",
            "video_url",
            "attachment",
            "duration_minutes",
            "order",
            "is_preview",
        ]

    def validate_attachment(self, value):
        if value is None:
            return value
        if value.size > 25 * 1024 * 1024:
            raise serializers.ValidationError("Attachments must be smaller than 25 MB.")
        return value


class CourseSectionSerializer(serializers.ModelSerializer):
    lessons = LessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = CourseSection
        fields = ["id", "course", "title", "summary", "order", "lessons"]
        read_only_fields = ["course"]

    def validate(self, attrs):
        course = self.context.get("course") or getattr(self.instance, "course", None)
        order = attrs.get("order", getattr(self.instance, "order", None))
        if course is not None and order is not None:
            qs = CourseSection.objects.filter(course=course, order=order)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"order": "Another section already uses this position."})
        return attrs


class CourseListSerializer(serializers.ModelSerializer):
    """Compact course card used across listings."""

    category = CategorySerializer(read_only=True)
    instructor = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    is_free = serializers.BooleanField(read_only=True)
    lesson_count = serializers.IntegerField(read_only=True)
    total_duration_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "subtitle",
            "category",
            "instructor",
            "difficulty",
            "thumbnail_url",
            "price_cents",
            "currency",
            "price",
            "is_free",
            "average_rating",
            "review_count",
            "enrollment_count",
            "lesson_count",
            "total_duration_minutes",
            "status",
            "published_at",
            "created_at",
        ]

    def get_instructor(self, obj):
        request = self.context.get("request")
        return _instructor_payload(obj.owner, request)

    def get_thumbnail_url(self, obj):
        return resolve_thumbnail(obj, self.context.get("request"))

    def get_price(self, obj):
        return obj.display_price


def _instructor_payload(user, request):
    avatar = None
    if user.avatar:
        avatar = user.avatar.url
        if request is not None:
            avatar = request.build_absolute_uri(avatar)
    elif user.avatar_url:
        avatar = user.avatar_url
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "headline": user.headline,
        "bio": user.bio,
        "avatar": avatar,
    }


def resolve_thumbnail(course: Course, request=None) -> str | None:
    if course.thumbnail:
        url = course.thumbnail.url
        return request.build_absolute_uri(url) if request else url
    return course.thumbnail_url or None


class CourseDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    instructor = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    is_free = serializers.BooleanField(read_only=True)
    viewer = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "subtitle",
            "description",
            "learning_objectives",
            "requirements",
            "category",
            "instructor",
            "difficulty",
            "thumbnail_url",
            "promo_video_url",
            "price_cents",
            "currency",
            "price",
            "is_free",
            "status",
            "is_featured",
            "average_rating",
            "review_count",
            "enrollment_count",
            "lesson_count",
            "total_duration_minutes",
            "sections",
            "published_at",
            "created_at",
            "updated_at",
            "viewer",
        ]

    def get_instructor(self, obj):
        request = self.context.get("request")
        payload = _instructor_payload(obj.owner, request)
        payload["course_count"] = obj.owner.courses_taught.filter(status="published").count()
        return payload

    def get_thumbnail_url(self, obj):
        return resolve_thumbnail(obj, self.context.get("request"))

    def get_price(self, obj):
        return obj.display_price

    def get_sections(self, obj):
        request = self.context.get("request")
        viewer = getattr(request, "user", None)
        # Decide whether the viewer may consume premium lesson bodies.
        from apps.learning.access import user_can_access_course_lessons

        full_access = user_can_access_course_lessons(viewer, obj)

        sections = obj.sections.prefetch_related("lessons").all()
        data = []
        for section in sections:
            lessons = section.lessons.all()
            lesson_data = []
            for lesson in lessons:
                if full_access or lesson.is_preview:
                    lesson_data.append(LessonDetailSerializer(lesson, context=self.context).data)
                else:
                    lesson_data.append(LessonSummarySerializer(lesson, context=self.context).data)
            data.append(
                {
                    "id": section.id,
                    "title": section.title,
                    "summary": section.summary,
                    "order": section.order,
                    "lessons": lesson_data,
                }
            )
        return data

    def get_viewer(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return {"is_authenticated": False, "is_enrolled": False, "is_owner": False, "can_access_full": False}
        from apps.learning.access import user_can_access_course_lessons
        from apps.learning.models import Enrollment

        is_owner = obj.owner_id == user.id
        is_enrolled = Enrollment.objects.filter(user=user, course=obj).exists()
        return {
            "is_authenticated": True,
            "is_enrolled": is_enrolled,
            "is_owner": is_owner,
            "can_access_full": user_can_access_course_lessons(user, obj),
        }


def instructor_course_count(user) -> int:
    return user.courses_taught.filter(status="published").count()
