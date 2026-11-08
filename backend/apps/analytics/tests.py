"""Tests for the custom admin dashboard endpoints and analytics aggregates."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRoles
from apps.audit.models import AuditLog
from apps.core.testing import make_admin, make_course, make_instructor, make_user
from apps.courses.models import Category, CourseStatus
from apps.learning.models import Enrollment
from apps.payments.models import Order, OrderStatus


class AdminAccessControlTests(APITestCase):
    def test_student_blocked_from_all_admin_endpoints(self):
        student = make_user("student@example.com")
        self.client.force_authenticate(student)
        for url in [
            "/api/v1/admin/stats/",
            "/api/v1/admin/users/",
            "/api/v1/admin/courses/",
            "/api/v1/admin/categories/",
            "/api/v1/admin/enrollments/",
            "/api/v1/admin/orders/",
            "/api/v1/admin/reviews/",
            "/api/v1/admin/audit-logs/",
            "/api/v1/admin/settings/",
        ]:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN, url)

    def test_instructor_blocked_from_admin_endpoints(self):
        instructor = make_instructor()
        self.client.force_authenticate(instructor)
        self.assertEqual(self.client.get("/api/v1/admin/users/").status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_blocked(self):
        self.assertEqual(self.client.get("/api/v1/admin/stats/").status_code, status.HTTP_401_UNAUTHORIZED)


class AdminStatsTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, price_cents=10000)
        self.student = make_user("student@example.com")
        self.client.force_authenticate(self.admin)

    def test_stats_use_real_aggregates(self):
        Enrollment.objects.create(user=self.student, course=self.course)
        Order.objects.create(
            user=self.student,
            course=self.course,
            course_title=self.course.title,
            amount_cents=10000,
            status=OrderStatus.PAID,
        )
        Order.objects.create(
            user=self.student,
            course=self.course,
            course_title="Refunded",
            amount_cents=5000,
            refunded_amount_cents=5000,
            status=OrderStatus.REFUNDED,
        )
        response = self.client.get("/api/v1/admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["revenue"]["gross"]["amount_cents"], 15000)
        self.assertEqual(response.data["revenue"]["refunded"]["amount_cents"], 5000)
        self.assertEqual(response.data["revenue"]["net"]["amount_cents"], 10000)
        self.assertEqual(response.data["enrollments"]["total"], 1)
        self.assertEqual(response.data["users"]["students"], 1)
        self.assertEqual(response.data["users"]["instructors"], 1)

    def test_pending_orders_not_counted_as_revenue(self):
        Order.objects.create(
            user=self.student,
            course=self.course,
            course_title=self.course.title,
            amount_cents=9999,
            status=OrderStatus.PENDING,
        )
        response = self.client.get("/api/v1/admin/stats/")
        self.assertEqual(response.data["revenue"]["gross"]["amount_cents"], 0)
        self.assertEqual(response.data["revenue"]["pending_orders"], 1)


class AdminUserManagementTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.student = make_user("student@example.com")
        self.client.force_authenticate(self.admin)

    def test_suspend_and_reactivate_user(self):
        response = self.client.post(
            f"/api/v1/admin/users/{self.student.id}/suspend/", {"suspend": True, "reason": "spam"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_suspended)
        self.assertTrue(AuditLog.objects.filter(action="user.suspended").exists())

        response = self.client.post(f"/api/v1/admin/users/{self.student.id}/suspend/", {"suspend": False}, format="json")
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_suspended)

    def test_admin_cannot_suspend_self(self):
        response = self.client.post(f"/api/v1/admin/users/{self.admin.id}/suspend/", {"suspend": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_users_by_pending_instructor(self):
        pending = make_user("pending@example.com", role=UserRoles.INSTRUCTOR, is_approved=False)
        response = self.client.get("/api/v1/admin/users/", {"pending_instructors": "true"})
        emails = [u["email"] for u in response.data["results"]]
        self.assertIn("pending@example.com", emails)
        self.assertNotIn("student@example.com", emails)

    def test_approve_instructor(self):
        pending = make_user("pending@example.com", role=UserRoles.INSTRUCTOR, is_approved=False)
        response = self.client.post(f"/api/v1/admin/users/{pending.id}/approve-instructor/", {"approve": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pending.refresh_from_db()
        self.assertTrue(pending.is_approved)


class AdminCourseModerationTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, status=CourseStatus.PENDING)
        self.client.force_authenticate(self.admin)

    def test_approve_course(self):
        response = self.client.post(
            f"/api/v1/admin/courses/{self.course.id}/moderate/", {"action": "approve"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, CourseStatus.PUBLISHED)
        self.assertIsNotNone(self.course.published_at)
        self.assertTrue(AuditLog.objects.filter(action="course.approved").exists())

    def test_reject_course_records_note(self):
        response = self.client.post(
            f"/api/v1/admin/courses/{self.course.id}/moderate/",
            {"action": "reject", "note": "Add more lessons"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, CourseStatus.REJECTED)
        self.assertEqual(self.course.moderation_note, "Add more lessons")

    def test_unknown_action_rejected(self):
        response = self.client.post(
            f"/api/v1/admin/courses/{self.course.id}/moderate/", {"action": "explode"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_feature_course(self):
        response = self.client.post(f"/api/v1/admin/courses/{self.course.id}/feature/", {"featured": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertTrue(self.course.is_featured)


class AdminCategoryTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_authenticate(self.admin)

    def test_create_update_delete_category(self):
        response = self.client.post("/api/v1/admin/categories/", {"name": "New Cat", "description": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category_id = response.data["id"]
        self.assertTrue(Category.objects.filter(pk=category_id).exists())

        response = self.client.patch(f"/api/v1/admin/categories/{category_id}/", {"name": "Renamed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.delete(f"/api/v1/admin/categories/{category_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_delete_category_in_use(self):
        instructor = make_instructor()
        course = make_course(instructor)
        response = self.client.delete(f"/api/v1/admin/categories/{course.category.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)


class AdminSettingsAndEnrollmentTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_authenticate(self.admin)

    def test_update_platform_settings(self):
        response = self.client.patch("/api/v1/admin/settings/", {"site_name": "PAI Learning"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["site_name"], "PAI Learning")
        self.assertTrue(AuditLog.objects.filter(action="settings.updated").exists())

    def test_enrollment_list_filter_by_status(self):
        instructor = make_instructor()
        course = make_course(instructor)
        student = make_user("student@example.com")
        Enrollment.objects.create(user=student, course=course, completed_at=None)
        response = self.client.get("/api/v1/admin/enrollments/", {"status": "in_progress"})
        self.assertEqual(response.data["count"], 1)


class InstructorAnalyticsTests(APITestCase):
    def test_instructor_sees_only_own_revenue(self):
        instructor = make_instructor()
        other = make_instructor(email="other@example.com")
        course = make_course(instructor, price_cents=2000)
        other_course = make_course(other, price_cents=9000, title="Other Course")
        student = make_user("student@example.com")
        Order.objects.create(user=student, course=course, course_title=course.title, amount_cents=2000, status=OrderStatus.PAID)
        Order.objects.create(
            user=student, course=other_course, course_title=other_course.title, amount_cents=9000, status=OrderStatus.PAID
        )

        self.client.force_authenticate(instructor)
        response = self.client.get("/api/v1/analytics/instructor/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totals"]["gross_revenue"]["amount_cents"], 2000)
        self.assertEqual(len(response.data["courses"]), 1)

    def test_student_cannot_access_instructor_analytics(self):
        student = make_user("student@example.com")
        self.client.force_authenticate(student)
        response = self.client.get("/api/v1/analytics/instructor/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PublicEndpointsTests(APITestCase):
    def test_public_stats_and_site_config_are_anonymous(self):
        instructor = make_instructor()
        make_course(instructor)
        response = self.client.get("/api/v1/analytics/public/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["courses"], 1)

        response = self.client.get("/api/v1/analytics/site-config/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("support_email", response.data)

    def test_openapi_schema_generates(self):
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
