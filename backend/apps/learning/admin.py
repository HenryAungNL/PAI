from django.contrib import admin

from apps.learning.models import Bookmark, Enrollment, LessonProgress


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "progress_percent", "enrolled_at", "completed_at"]
    list_filter = ["completed_at"]
    search_fields = ["user__email", "course__title"]
    raw_id_fields = ["user", "course"]


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "lesson", "completed_at"]
    search_fields = ["enrollment__user__email", "lesson__title"]


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "created_at"]
    search_fields = ["user__email", "course__title"]
