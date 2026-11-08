"""Shared helpers for building test fixtures."""
from django.contrib.auth import get_user_model

from apps.accounts.models import UserRoles
from apps.courses.models import Category, Course, CourseSection, CourseStatus, Difficulty, Lesson

User = get_user_model()


def make_user(email, password="Str0ng-Passw0rd!", role=UserRoles.STUDENT, **extra) -> User:
    return User.objects.create_user(email=email, password=password, role=role, **extra)


def make_instructor(email="instructor@example.com", **extra) -> User:
    extra.setdefault("is_approved", True)
    return make_user(email, role=UserRoles.INSTRUCTOR, **extra)


def make_admin(email="admin@example.com", **extra) -> User:
    return make_user(email, role=UserRoles.ADMIN, **extra)


def make_category(name="Programming", **extra) -> Category:
    return Category.objects.create(name=name, **extra)


def make_course(owner, *, status=CourseStatus.PUBLISHED, price_cents=1000, sections=2, lessons_per_section=2, **extra) -> Course:
    category = extra.pop("category", None) or make_category(name=f"Cat-{owner.id}-{status}" if not extra.get("title") else extra["title"])
    course = Course.objects.create(
        owner=owner,
        category=category,
        title=extra.pop("title", "Test Course"),
        description="A test course description that is definitely long enough.",
        difficulty=extra.pop("difficulty", Difficulty.BEGINNER),
        price_cents=price_cents,
        status=status,
        **extra,
    )
    for s in range(1, sections + 1):
        section = CourseSection.objects.create(course=course, title=f"Section {s}", order=s)
        for l in range(1, lessons_per_section + 1):
            Lesson.objects.create(
                section=section,
                title=f"Lesson {s}.{l}",
                description="Lesson description",
                duration_minutes=10,
                order=l,
                is_preview=(s == 1 and l == 1),
            )
    course.recompute_aggregates()
    return course
