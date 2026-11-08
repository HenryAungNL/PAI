"""Tests for enrollment access, progress tracking, bookmarks and certificates."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.certificates.models import Certificate
from apps.core.testing import make_admin, make_course, make_instructor, make_user
from apps.courses.models import CourseStatus, Lesson
from apps.learning.models import Bookmark, Enrollment, LessonProgress


class LessonAccessTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor)
        self.student = make_user("student@example.com")
        self.outsider = make_user("outsider@example.com")

    def test_outsider_cannot_open_player(self):
        self.client.force_authenticate(self.outsider)
        response = self.client.get(f"/api/v1/my/courses/{self.course.id}/player/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enrolled_student_gets_full_curriculum(self):
        Enrollment.objects.create(user=self.student, course=self.course)
        self.client.force_authenticate(self.student)
        response = self.client.get(f"/api/v1/my/courses/{self.course.id}/player/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Every lesson now exposes its body.
        for section in response.data["sections"]:
            for lesson in section["lessons"]:
                self.assertIn("video_url", lesson)

    def test_course_owner_can_open_player(self):
        self.client.force_authenticate(self.instructor)
        response = self.client.get(f"/api/v1/my/courses/{self.course.id}/player/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_open_player(self):
        admin = make_admin()
        self.client.force_authenticate(admin)
        response = self.client.get(f"/api/v1/my/courses/{self.course.id}/player/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_outsider_cannot_complete_lesson(self):
        lesson = Lesson.objects.filter(section__course=self.course).first()
        self.client.force_authenticate(self.outsider)
        response = self.client.post(f"/api/v1/my/lessons/{lesson.id}/complete/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ProgressTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, sections=2, lessons_per_section=2)
        self.student = make_user("student@example.com")
        self.enrollment = Enrollment.objects.create(user=self.student, course=self.course)
        self.client.force_authenticate(self.student)

    def test_marking_lessons_complete_updates_progress(self):
        lessons = list(Lesson.objects.filter(section__course=self.course).order_by("id"))
        response = self.client.post(f"/api/v1/my/lessons/{lessons[0].id}/complete/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["progress_percent"], 25)
        self.assertFalse(response.data["course_completed"])

    def test_marking_complete_is_idempotent(self):
        lesson = Lesson.objects.filter(section__course=self.course).first()
        self.client.post(f"/api/v1/my/lessons/{lesson.id}/complete/")
        self.client.post(f"/api/v1/my/lessons/{lesson.id}/complete/")
        self.assertEqual(LessonProgress.objects.filter(enrollment=self.enrollment).count(), 1)

    def test_completing_all_lessons_completes_course_and_issues_certificate(self):
        lessons = Lesson.objects.filter(section__course=self.course)
        last = None
        for lesson in lessons:
            last = self.client.post(f"/api/v1/my/lessons/{lesson.id}/complete/")
        self.assertEqual(last.data["progress_percent"], 100)
        self.assertTrue(last.data["course_completed"])
        self.assertIsNotNone(last.data["certificate"])

        self.enrollment.refresh_from_db()
        self.assertIsNotNone(self.enrollment.completed_at)
        self.assertTrue(Certificate.objects.filter(enrollment=self.enrollment).exists())

    def test_uncomplete_reduces_progress(self):
        lessons = list(Lesson.objects.filter(section__course=self.course).order_by("id"))
        self.client.post(f"/api/v1/my/lessons/{lessons[0].id}/complete/")
        response = self.client.post(f"/api/v1/my/lessons/{lessons[0].id}/complete/", {"completed": False}, format="json")
        self.assertEqual(response.data["progress_percent"], 0)

    def test_progress_endpoint_reports_completed_ids(self):
        lesson = Lesson.objects.filter(section__course=self.course).first()
        self.client.post(f"/api/v1/my/lessons/{lesson.id}/complete/")
        response = self.client.get(f"/api/v1/my/courses/{self.course.id}/progress/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(lesson.id, response.data["completed_lesson_ids"])
        self.assertEqual(response.data["total_lessons"], 4)


class EnrollmentListTests(APITestCase):
    def test_my_enrollments_filters(self):
        instructor = make_instructor()
        course_a = make_course(instructor, title="A", sections=1, lessons_per_section=1)
        course_b = make_course(instructor, title="B")
        student = make_user("student@example.com")
        enrollment_a = Enrollment.objects.create(user=student, course=course_a)
        Enrollment.objects.create(user=student, course=course_b)
        # Complete every lesson in course A so it registers as completed.
        for lesson in course_a.sections.first().lessons.all():
            LessonProgress.objects.create(enrollment=enrollment_a, lesson=lesson)
        enrollment_a.recalculate_progress()

        self.client.force_authenticate(student)
        response = self.client.get("/api/v1/my/enrollments/")
        self.assertEqual(len(response.data), 2)

        response = self.client.get("/api/v1/my/enrollments/", {"status": "completed"})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course"]["title"], "A")

        response = self.client.get("/api/v1/my/enrollments/", {"status": "in_progress"})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course"]["title"], "B")


class BookmarkTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor)
        self.student = make_user("student@example.com")
        self.client.force_authenticate(self.student)

    def test_bookmark_create_and_delete(self):
        response = self.client.post("/api/v1/my/bookmarks/", {"course_id": self.course.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bookmark.objects.count(), 1)

        # Duplicate bookmark is idempotent.
        response = self.client.post("/api/v1/my/bookmarks/", {"course_id": self.course.id}, format="json")
        self.assertEqual(Bookmark.objects.count(), 1)

        response = self.client.delete(f"/api/v1/my/bookmarks/{self.course.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Bookmark.objects.count(), 0)


class CertificateTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, sections=1, lessons_per_section=2)
        self.student = make_user("student@example.com")
        self.enrollment = Enrollment.objects.create(user=self.student, course=self.course)
        self.client.force_authenticate(self.student)

    def test_cannot_issue_certificate_without_completion(self):
        response = self.client.post(f"/api/v1/my/courses/{self.course.id}/certificate/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_certificate_issued_after_completion(self):
        for lesson in Lesson.objects.filter(section__course=self.course):
            LessonProgress.objects.create(enrollment=self.enrollment, lesson=lesson)
        self.enrollment.recalculate_progress()

        response = self.client.post(f"/api/v1/my/courses/{self.course.id}/certificate/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        code = response.data["code"]

        # Public verification works without authentication.
        self.client.force_authenticate(None)
        response = self.client.get(f"/api/v1/certificates/verify/{code}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["certificate"]["course_title"], self.course.title)

    def test_certificate_verify_unknown_code(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/v1/certificates/verify/PAI-NOPE/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
