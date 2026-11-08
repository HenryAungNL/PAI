import secrets

from django.conf import settings
from django.db import models

from apps.courses.models import Course
from apps.learning.models import Enrollment


def generate_certificate_code() -> str:
    """Human-friendly, unique, unguessable certificate identifier."""
    return "PAI-" + secrets.token_hex(6).upper()


class Certificate(models.Model):
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name="certificate")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="certificates")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="certificates")
    code = models.CharField(max_length=32, unique=True, default=generate_certificate_code)
    student_name = models.CharField(max_length=255)
    course_title = models.CharField(max_length=200)
    final_score_percent = models.PositiveSmallIntegerField(default=100)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self) -> str:
        return f"{self.code} · {self.student_name} · {self.course_title}"
