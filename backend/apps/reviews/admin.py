from django.contrib import admin

from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["course", "user", "rating", "moderation_status", "is_reported", "created_at"]
    list_filter = ["moderation_status", "is_reported", "rating"]
    search_fields = ["course__title", "user__email", "body"]
    raw_id_fields = ["course", "user"]
