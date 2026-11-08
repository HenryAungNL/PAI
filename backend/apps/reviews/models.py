from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.courses.models import Course


class ReviewModerationStatus(models.TextChoices):
    VISIBLE = "visible", "Visible"
    HIDDEN = "hidden", "Hidden"


class Review(models.Model):
    """A verified-student review. Only enrolled students may create one."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=150, blank=True)
    body = models.TextField(blank=True)
    moderation_status = models.CharField(
        max_length=16, choices=ReviewModerationStatus.choices, default=ReviewModerationStatus.VISIBLE
    )
    is_reported = models.BooleanField(default=False)
    report_reason = models.CharField(max_length=255, blank=True)
    is_demo = models.BooleanField(default=False, help_text="Seeded demonstration content")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["course", "user"], name="unique_review_per_user_course")
        ]
        indexes = [models.Index(fields=["course", "moderation_status"])]

    def __str__(self) -> str:
        return f"{self.rating}★ {self.course.title} by {self.user.email}"
