from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.courses.models import Course, Lesson


class Enrollment(models.Model):
    """A student's access to a course. Created only after verified payment or a
    free enrollment."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="unique_enrollment_per_user_course")
        ]
        ordering = ["-enrolled_at"]
        indexes = [models.Index(fields=["user", "course"])]

    def __str__(self) -> str:
        return f"{self.user.email} → {self.course.title}"

    @property
    def is_completed(self) -> bool:
        return self.completed_at is not None

    def recalculate_progress(self, save: bool = True):
        """Recompute completion from LessonProgress. Returns the new percentage."""
        total = Lesson.objects.filter(section__course=self.course).count()
        if total == 0:
            percent = 0
        else:
            done = LessonProgress.objects.filter(
                enrollment=self, lesson__section__course=self.course
            ).count()
            percent = int(round((done / total) * 100))
        self.progress_percent = percent
        if percent >= 100 and self.completed_at is None:
            self.completed_at = timezone.now()
        elif percent < 100:
            self.completed_at = None
        if save:
            self.save(update_fields=["progress_percent", "completed_at"])
        return percent


class LessonProgress(models.Model):
    """One row per completed lesson for a user, tied to their enrollment."""

    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="progress_records")
    completed_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["enrollment", "lesson"], name="unique_lesson_progress")
        ]
        indexes = [models.Index(fields=["enrollment", "lesson"])]

    def __str__(self) -> str:
        return f"{self.enrollment.user.email} ✓ {self.lesson.title}"


class Bookmark(models.Model):
    """A saved / bookmarked course for later."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarks")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="bookmarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="unique_bookmark_per_user_course")
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.email} ★ {self.course.title}"
