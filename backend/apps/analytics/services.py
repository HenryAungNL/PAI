"""Aggregate analytics computed from real database rows.

Revenue rules (documented in README):
* Gross revenue   = sum of amount_cents for orders in {paid, partially_refunded, refunded}.
* Refunded amount = sum of refunded_amount_cents across those orders.
* Net revenue     = gross − refunded.
Only orders touched by a verified Stripe webhook (or verified reconciliation)
ever reach a "paid" state.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.accounts.models import UserRoles
from apps.courses.models import Course, CourseStatus
from apps.learning.models import Enrollment
from apps.payments.models import Order, OrderStatus
from apps.reviews.models import Review

User = get_user_model()

PAID_STATUSES = [OrderStatus.PAID, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.REFUNDED]


def _money(cents: int | None) -> dict:
    return {"amount_cents": int(cents or 0), "amount": round((cents or 0) / 100, 2), "currency": "usd"}


def platform_stats() -> dict:
    paid_orders = Order.objects.filter(status__in=PAID_STATUSES)
    revenue = paid_orders.aggregate(
        gross=Sum("amount_cents"), refunded=Sum("refunded_amount_cents")
    )
    gross = revenue["gross"] or 0
    refunded = revenue["refunded"] or 0

    now = timezone.now()
    since_30 = now - timedelta(days=30)
    enrollments_30 = Enrollment.objects.filter(enrolled_at__gte=since_30).count()
    revenue_30 = paid_orders.filter(paid_at__gte=since_30).aggregate(total=Sum("amount_cents"))["total"] or 0

    return {
        "users": {
            "total": User.objects.count(),
            "students": User.objects.filter(role=UserRoles.STUDENT).count(),
            "instructors": User.objects.filter(role=UserRoles.INSTRUCTOR).count(),
            "admins": User.objects.filter(role=UserRoles.ADMIN).count(),
            "active": User.objects.filter(is_active=True, is_suspended=False).count(),
            "suspended": User.objects.filter(is_suspended=True).count(),
            "new_last_30_days": User.objects.filter(created_at__gte=since_30).count(),
        },
        "courses": {
            "total": Course.objects.count(),
            "published": Course.objects.filter(status=CourseStatus.PUBLISHED).count(),
            "pending": Course.objects.filter(status=CourseStatus.PENDING).count(),
            "draft": Course.objects.filter(status=CourseStatus.DRAFT).count(),
            "rejected": Course.objects.filter(status=CourseStatus.REJECTED).count(),
            "archived": Course.objects.filter(status=CourseStatus.ARCHIVED).count(),
        },
        "enrollments": {
            "total": Enrollment.objects.count(),
            "completed": Enrollment.objects.filter(completed_at__isnull=False).count(),
            "last_30_days": enrollments_30,
        },
        "revenue": {
            "gross": _money(gross),
            "refunded": _money(refunded),
            "net": _money(gross - refunded),
            "last_30_days": _money(revenue_30),
            "paid_orders": paid_orders.count(),
            "pending_orders": Order.objects.filter(status=OrderStatus.PENDING).count(),
        },
        "reviews": {
            "total": Review.objects.count(),
            "reported": Review.objects.filter(is_reported=True).count(),
            "average_rating": round(Review.objects.aggregate(avg=Avg("rating"))["avg"] or 0, 2),
        },
    }


def public_stats() -> dict:
    """Small, real numbers for the public homepage trust indicators."""
    return {
        "courses": Course.objects.filter(status=CourseStatus.PUBLISHED).count(),
        "instructors": User.objects.filter(role=UserRoles.INSTRUCTOR, is_approved=True).count(),
        "students": Enrollment.objects.values("user").distinct().count(),
        "average_rating": round(
            Review.objects.aggregate(avg=Avg("rating"))["avg"] or 0, 1
        ),
    }


def instructor_stats(user) -> dict:
    courses = Course.objects.filter(owner=user)
    course_ids = list(courses.values_list("id", flat=True))
    paid_orders = Order.objects.filter(course_id__in=course_ids, status__in=PAID_STATUSES)
    revenue = paid_orders.aggregate(gross=Sum("amount_cents"), refunded=Sum("refunded_amount_cents"))
    gross = revenue["gross"] or 0
    refunded = revenue["refunded"] or 0

    per_course = []
    for course in courses.order_by("-enrollment_count"):
        course_revenue = Order.objects.filter(course=course, status__in=PAID_STATUSES).aggregate(
            gross=Sum("amount_cents"), refunded=Sum("refunded_amount_cents")
        )
        g = course_revenue["gross"] or 0
        r = course_revenue["refunded"] or 0
        per_course.append(
            {
                "id": course.id,
                "title": course.title,
                "slug": course.slug,
                "status": course.status,
                "price_cents": course.price_cents,
                "enrollment_count": Enrollment.objects.filter(course=course).count(),
                "completed_count": Enrollment.objects.filter(course=course, completed_at__isnull=False).count(),
                "average_rating": float(course.average_rating),
                "review_count": course.review_count,
                "gross_revenue": _money(g),
                "refunded": _money(r),
                "net_revenue": _money(g - r),
            }
        )

    return {
        "totals": {
            "courses": courses.count(),
            "published": courses.filter(status=CourseStatus.PUBLISHED).count(),
            "pending": courses.filter(status=CourseStatus.PENDING).count(),
            "drafts": courses.filter(status=CourseStatus.DRAFT).count(),
            "students": Enrollment.objects.filter(course_id__in=course_ids).values("user").distinct().count(),
            "enrollments": Enrollment.objects.filter(course_id__in=course_ids).count(),
            "completions": Enrollment.objects.filter(course_id__in=course_ids, completed_at__isnull=False).count(),
            "gross_revenue": _money(gross),
            "refunded": _money(refunded),
            "net_revenue": _money(gross - refunded),
            "average_rating": round(
                courses.aggregate(avg=Avg("average_rating"))["avg"] or 0, 2
            ),
        },
        "courses": per_course,
    }


def enrollment_trend(days: int = 30) -> list[dict]:
    since = timezone.now() - timedelta(days=days)
    rows = (
        Enrollment.objects.filter(enrolled_at__gte=since)
        .annotate(day=TruncDate("enrolled_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    return [{"date": row["day"].isoformat(), "count": row["count"]} for row in rows]


def revenue_trend(days: int = 30) -> list[dict]:
    since = timezone.now() - timedelta(days=days)
    rows = (
        Order.objects.filter(paid_at__gte=since, status__in=PAID_STATUSES)
        .annotate(day=TruncDate("paid_at"))
        .values("day")
        .annotate(total=Sum("amount_cents"))
        .order_by("day")
    )
    return [{"date": row["day"].isoformat(), "amount_cents": row["total"] or 0} for row in rows]


def recent_activity(limit: int = 8) -> dict:
    recent_users = (
        User.objects.order_by("-created_at")
        .values("id", "email", "first_name", "last_name", "role", "created_at")[:limit]
    )
    recent_orders = (
        Order.objects.select_related("user")
        .filter(status__in=PAID_STATUSES)
        .order_by("-paid_at")
        .values("id", "course_title", "amount_cents", "currency", "paid_at", "user__email")[:limit]
    )
    return {
        "recent_registrations": [
            {
                "id": u["id"],
                "email": u["email"],
                "name": f"{u['first_name']} {u['last_name']}".strip() or u["email"],
                "role": u["role"],
                "created_at": u["created_at"],
            }
            for u in recent_users
        ],
        "recent_transactions": [
            {
                "id": o["id"],
                "course_title": o["course_title"],
                "amount_cents": o["amount_cents"],
                "currency": o["currency"],
                "paid_at": o["paid_at"],
                "email": o["user__email"],
            }
            for o in recent_orders
        ],
    }
