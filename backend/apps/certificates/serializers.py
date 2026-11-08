from rest_framework import serializers

from apps.certificates.models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    course_slug = serializers.CharField(source="course.slug", read_only=True)
    verify_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            "id",
            "code",
            "student_name",
            "course_title",
            "course_slug",
            "final_score_percent",
            "issued_at",
            "verify_url",
        ]

    def get_verify_url(self, obj):
        return f"/verify/{obj.code}"


class PublicCertificateSerializer(serializers.ModelSerializer):
    """Minimal, PII-safe payload for public verification."""

    class Meta:
        model = Certificate
        fields = ["code", "student_name", "course_title", "issued_at", "final_score_percent"]
