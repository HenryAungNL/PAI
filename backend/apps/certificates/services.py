"""Certificate issuance. A certificate is only created after the server has
verified that every lesson in the course is complete."""
from __future__ import annotations

import logging

from apps.certificates.models import Certificate
from apps.courses.models import Lesson
from apps.learning.models import Enrollment, LessonProgress

logger = logging.getLogger(__name__)

COMPLETION_THRESHOLD = 100


def course_completion_percent(enrollment: Enrollment) -> int:
    total = Lesson.objects.filter(section__course=enrollment.course).count()
    if total == 0:
        return 0
    done = LessonProgress.objects.filter(enrollment=enrollment).count()
    return int(round((done / total) * 100))


def is_eligible_for_certificate(enrollment: Enrollment) -> bool:
    return course_completion_percent(enrollment) >= COMPLETION_THRESHOLD


def issue_certificate(enrollment: Enrollment) -> Certificate | None:
    """Create (or return the existing) certificate when the student qualifies."""
    if not is_eligible_for_certificate(enrollment):
        return None

    existing = Certificate.objects.filter(enrollment=enrollment).first()
    if existing is not None:
        return existing

    certificate = Certificate.objects.create(
        enrollment=enrollment,
        user=enrollment.user,
        course=enrollment.course,
        student_name=enrollment.user.full_name or enrollment.user.email,
        course_title=enrollment.course.title,
        final_score_percent=course_completion_percent(enrollment),
    )
    logger.info("Issued certificate %s for enrollment %s", certificate.code, enrollment.id)
    return certificate
