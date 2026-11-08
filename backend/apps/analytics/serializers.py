from rest_framework import serializers

from apps.analytics.models import PlatformSettings


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = [
            "site_name",
            "tagline",
            "support_email",
            "contact_phone",
            "contact_address",
            "twitter_url",
            "linkedin_url",
            "instagram_url",
            "youtube_url",
            "facebook_url",
            "terms_url",
            "privacy_url",
            "refund_policy_url",
            "allow_instructor_registration",
            "stripe_test_mode",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class PublicSiteConfigSerializer(serializers.ModelSerializer):
    """Safe subset exposed on the public site."""

    class Meta:
        model = PlatformSettings
        fields = [
            "site_name",
            "tagline",
            "support_email",
            "contact_phone",
            "contact_address",
            "twitter_url",
            "linkedin_url",
            "instagram_url",
            "youtube_url",
            "facebook_url",
            "terms_url",
            "privacy_url",
            "refund_policy_url",
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    course_count = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = None  # set below
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "is_suspended",
            "suspension_reason",
            "is_approved",
            "avatar",
            "avatar_url",
            "headline",
            "course_count",
            "enrollment_count",
            "date_joined",
            "created_at",
        ]

    def get_course_count(self, obj):
        return obj.courses_taught.count()

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


from django.contrib.auth import get_user_model  # noqa: E402

AdminUserSerializer.Meta.model = get_user_model()


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["role", "is_active", "is_approved", "is_suspended", "suspension_reason", "first_name", "last_name"]
