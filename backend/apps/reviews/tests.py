"""Tests for reviews and moderation."""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.testing import make_admin, make_course, make_instructor, make_user
from apps.learning.models import Enrollment
from apps.reviews.models import Review, ReviewModerationStatus


class ReviewTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor)
        self.student = make_user("student@example.com")
        self.client.force_authenticate(self.student)

    def test_unenrolled_student_cannot_review(self):
        response = self.client.post(
            f"/api/v1/courses/{self.course.id}/my-review/", {"rating": 5, "body": "Great"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enrolled_student_can_review_and_aggregates_update(self):
        Enrollment.objects.create(user=self.student, course=self.course)
        response = self.client.post(
            f"/api/v1/courses/{self.course.id}/my-review/", {"rating": 4, "body": "Solid course"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.course.refresh_from_db()
        self.assertEqual(self.course.review_count, 1)
        self.assertEqual(float(self.course.average_rating), 4.0)

    def test_duplicate_review_rejected(self):
        Enrollment.objects.create(user=self.student, course=self.course)
        self.client.post(f"/api/v1/courses/{self.course.id}/my-review/", {"rating": 5}, format="json")
        response = self.client.post(f"/api/v1/courses/{self.course.id}/my-review/", {"rating": 3}, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(Review.objects.count(), 1)

    def test_rating_out_of_range_rejected(self):
        Enrollment.objects.create(user=self.student, course=self.course)
        response = self.client.post(f"/api/v1/courses/{self.course.id}/my-review/", {"rating": 9}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_review_list_hides_hidden_reviews(self):
        other = make_user("other@example.com")
        Enrollment.objects.create(user=other, course=self.course)
        Review.objects.create(course=self.course, user=other, rating=1, moderation_status=ReviewModerationStatus.HIDDEN)
        self.client.force_authenticate(None)
        response = self.client.get(f"/api/v1/courses/{self.course.id}/reviews/")
        self.assertEqual(len(response.data["results"]), 0)

    def test_author_can_delete_own_review(self):
        Enrollment.objects.create(user=self.student, course=self.course)
        review = Review.objects.create(course=self.course, user=self.student, rating=5)
        response = self.client.delete(f"/api/v1/reviews/{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Review.objects.count(), 0)

    def test_reporting_review(self):
        other = make_user("other@example.com")
        review = Review.objects.create(course=self.course, user=other, rating=1, body="spam")
        response = self.client.post(f"/api/v1/reviews/{review.id}/report/", {"reason": "spam"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertTrue(review.is_reported)

    def test_cannot_report_own_review(self):
        Enrollment.objects.create(user=self.student, course=self.course)
        review = Review.objects.create(course=self.course, user=self.student, rating=5)
        response = self.client.post(f"/api/v1/reviews/{review.id}/report/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AdminReviewModerationTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor)
        self.student = make_user("student@example.com")
        self.review = Review.objects.create(course=self.course, user=self.student, rating=5)
        self.admin = make_admin()

    def test_hiding_review_updates_aggregates(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/admin/reviews/{self.review.id}/", {"moderation_status": "hidden"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.review_count, 0)

    def test_non_admin_cannot_moderate(self):
        self.client.force_authenticate(self.student)
        response = self.client.patch(
            f"/api/v1/admin/reviews/{self.review.id}/", {"moderation_status": "hidden"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
