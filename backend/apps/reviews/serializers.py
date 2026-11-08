from rest_framework import serializers

from apps.accounts.serializers import PublicUserSerializer
from apps.learning.models import Enrollment
from apps.reviews.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    student = PublicUserSerializer(source="user", read_only=True)
    is_verified_enrollment = serializers.SerializerMethodField()
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "course",
            "course_title",
            "student",
            "rating",
            "title",
            "body",
            "moderation_status",
            "is_reported",
            "is_demo",
            "is_verified_enrollment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["course", "moderation_status", "is_reported", "is_demo"]

    def get_is_verified_enrollment(self, obj):
        return Enrollment.objects.filter(user=obj.user, course=obj.course).exists()


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["rating", "title", "body"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_body(self, value):
        if value and len(value) > 4000:
            raise serializers.ValidationError("Review is too long.")
        return value


class ReviewModerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["moderation_status"]
