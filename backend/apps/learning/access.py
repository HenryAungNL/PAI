"""Access rules shared across apps."""
from apps.courses.models import Course, CourseStatus


def user_can_access_course_lessons(user, course: Course) -> bool:
    """True when `user` may consume the full lesson bodies of `course`.

    Granted to: platform admins, the course owner, and enrolled students.
    Preview lessons are handled separately by callers.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_pai_admin", False):
        return True
    if course.owner_id == user.id:
        return True

    from apps.learning.models import Enrollment

    return Enrollment.objects.filter(user=user, course=course).exists()


def is_publicly_visible(course: Course) -> bool:
    return course.status == CourseStatus.PUBLISHED
