"""Tests for the course catalog and instructor authoring."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.testing import make_admin, make_course, make_instructor, make_category, make_user
from apps.courses.models import Course, CourseStatus, Lesson

PASSWORD = "Str0ng-Passw0rd!"


class PublicCatalogTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.published = make_course(self.instructor, title="Published Course", status=CourseStatus.PUBLISHED)
        self.draft = make_course(self.instructor, title="Draft Course", status=CourseStatus.DRAFT)

    def test_only_published_courses_listed(self):
        response = self.client.get("/api/v1/courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [c["title"] for c in response.data["results"]]
        self.assertIn("Published Course", titles)
        self.assertNotIn("Draft Course", titles)

    def test_detail_returns_curriculum(self):
        response = self.client.get(f"/api/v1/courses/{self.published.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Published Course")
        self.assertEqual(len(response.data["sections"]), 2)
        # Anonymous users get preview bodies but summaries for premium lessons.
        first_lesson = response.data["sections"][0]["lessons"][0]
        self.assertIn("video_url", first_lesson)
        second_lesson = response.data["sections"][1]["lessons"][0]
        self.assertNotIn("video_url", second_lesson)

    def test_draft_detail_hidden_from_public(self):
        response = self.client.get(f"/api/v1/courses/{self.draft.slug}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_view_own_draft(self):
        self.client.force_authenticate(self.instructor)
        response = self.client.get(f"/api/v1/courses/{self.draft.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_search_and_filters(self):
        make_course(self.instructor, title="Advanced Machine Learning", status=CourseStatus.PUBLISHED, price_cents=0)
        response = self.client.get("/api/v1/courses/", {"search": "Machine"})
        self.assertEqual(len(response.data["results"]), 1)

        response = self.client.get("/api/v1/courses/", {"free": "true"})
        titles = [c["title"] for c in response.data["results"]]
        self.assertIn("Advanced Machine Learning", titles)
        self.assertNotIn("Published Course", titles)

        response = self.client.get("/api/v1/courses/", {"price_max": "0"})
        self.assertEqual(len(response.data["results"]), 1)


class InstructorAuthoringTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.other = make_instructor(email="other@example.com")
        self.student = make_user("student@example.com")

    def test_student_cannot_create_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/v1/instructor/courses/",
            {"title": "Nope", "description": "x" * 40, "price_cents": 0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_creates_draft(self):
        self.client.force_authenticate(self.instructor)
        response = self.client.post(
            "/api/v1/instructor/courses/",
            {"title": "My New Course", "description": "A genuinely long description for testing.", "price_cents": 2500, "learning_objectives": ["Learn a", "Learn b"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        course = Course.objects.get(title="My New Course")
        self.assertEqual(course.status, CourseStatus.DRAFT)
        self.assertEqual(course.owner, self.instructor)

    def test_instructor_cannot_edit_other_instructors_course(self):
        course = make_course(self.other, status=CourseStatus.DRAFT)
        self.client.force_authenticate(self.instructor)
        response = self.client.patch(f"/api/v1/instructor/courses/{course.id}/", {"title": "Hacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_submit_for_review(self):
        course = make_course(self.instructor, status=CourseStatus.DRAFT)
        self.client.force_authenticate(self.instructor)
        response = self.client.post(f"/api/v1/instructor/courses/{course.id}/submit/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        course.refresh_from_db()
        self.assertEqual(course.status, CourseStatus.PENDING)

    def test_cannot_submit_empty_course(self):
        course = make_course(self.instructor, status=CourseStatus.DRAFT, sections=0)
        self.client.force_authenticate(self.instructor)
        response = self.client.post(f"/api/v1/instructor/courses/{course.id}/submit/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_section_and_lesson_creation(self):
        course = make_course(self.instructor, status=CourseStatus.DRAFT, sections=0)
        self.client.force_authenticate(self.instructor)
        response = self.client.post(
            f"/api/v1/instructor/courses/{course.id}/sections/", {"title": "Getting started"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        section_id = response.data["id"]

        response = self.client.post(
            f"/api/v1/instructor/sections/{section_id}/lessons/",
            {"title": "First lesson", "video_url": "https://example.com/v.mp4", "duration_minutes": 5},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        course.refresh_from_db()
        self.assertEqual(course.lesson_count, 1)
        self.assertEqual(course.total_duration_minutes, 5)

    def test_cannot_delete_course_with_enrollments(self):
        from apps.learning.models import Enrollment

        course = make_course(self.instructor)
        Enrollment.objects.create(user=self.student, course=course)
        self.client.force_authenticate(self.instructor)
        response = self.client.delete(f"/api/v1/instructor/courses/{course.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)


class LessonOrderConstraintTests(APITestCase):
    def test_duplicate_order_in_section_rejected(self):
        from django.db import IntegrityError

        instructor = make_instructor()
        course = make_course(instructor, sections=1, lessons_per_section=1)
        section = course.sections.first()
        with self.assertRaises(IntegrityError):
            Lesson.objects.create(section=section, title="dup", order=1)
