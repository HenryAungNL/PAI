"""Recompute a course's rating aggregates whenever reviews change."""
from django.db.models import Avg, Count

from apps.courses.models import Course
from apps.reviews.models import ReviewModerationStatus


def recompute_course_rating(course: Course):
    agg = course.reviews.filter(moderation_status=ReviewModerationStatus.VISIBLE).aggregate(
        avg=Avg("rating"), count=Count("id")
    )
    course.average_rating = round(agg["avg"] or 0, 2)
    course.review_count = agg["count"] or 0
    course.save(update_fields=["average_rating", "review_count", "updated_at"])
