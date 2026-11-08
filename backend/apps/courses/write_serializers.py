"""Write serializers for course authoring (instructor-facing)."""
from rest_framework import serializers

from apps.courses.models import Course, CourseStatus, Difficulty


class CourseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "subtitle",
            "description",
            "learning_objectives",
            "requirements",
            "category",
            "difficulty",
            "price_cents",
            "currency",
            "thumbnail",
            "thumbnail_url",
            "promo_video_url",
            "status",
        ]
        read_only_fields = ["status"]

    def validate_price_cents(self, value):
        if value is None:
            return 0
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        if value > 100_000_00:
            raise serializers.ValidationError("Price is unrealistically high.")
        return value

    def validate_learning_objectives(self, value):
        return _clean_string_list(value, "learning objectives")

    def validate_requirements(self, value):
        return _clean_string_list(value, "requirements")

    def validate_currency(self, value):
        value = (value or "usd").lower()
        if len(value) != 3:
            raise serializers.ValidationError("Currency must be a 3-letter ISO code.")
        return value

    def validate_thumbnail(self, value):
        if value is None:
            return value
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Thumbnail must be smaller than 5 MB.")
        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise serializers.ValidationError("Thumbnail must be a JPEG, PNG or WebP image.")
        return value

    def validate(self, attrs):
        description = attrs.get("description", getattr(self.instance, "description", ""))
        if self.instance is None and len((description or "").strip()) < 30:
            raise serializers.ValidationError(
                {"description": "Please write at least 30 characters describing the course."}
            )
        return attrs


def _clean_string_list(value, label):
    if value in (None, ""):
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError(f"{label.capitalize()} must be a list of strings.")
    cleaned = [str(item).strip() for item in value if str(item).strip()]
    return cleaned[:20]
