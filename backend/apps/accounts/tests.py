"""Tests for authentication, roles and account management."""
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRoles

User = get_user_model()

PASSWORD = "Str0ng-Passw0rd!"


class RegistrationTests(APITestCase):
    def test_register_student_sets_refresh_cookie(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "New.Student@Example.com",
                "password": PASSWORD,
                "password_confirm": PASSWORD,
                "first_name": "New",
                "last_name": "Student",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], UserRoles.STUDENT)
        # Email is normalised to lower case.
        user = User.objects.get(email="new.student@example.com")
        self.assertTrue(user.check_password(PASSWORD))
        # Refresh cookie is set and HttpOnly.
        self.assertIn("pai_refresh", response.cookies)
        self.assertTrue(response.cookies["pai_refresh"]["httponly"])

    def test_register_instructor_requires_approval(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "teacher@example.com",
                "password": PASSWORD,
                "password_confirm": PASSWORD,
                "role": UserRoles.INSTRUCTOR,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="teacher@example.com")
        self.assertFalse(user.is_approved)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(email="dup@example.com", password=PASSWORD)
        response = self.client.post(
            reverse("auth-register"),
            {"email": "dup@example.com", "password": PASSWORD, "password_confirm": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_password_mismatch_rejected(self):
        response = self.client.post(
            reverse("auth-register"),
            {"email": "x@example.com", "password": PASSWORD, "password_confirm": "different"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_rejected(self):
        response = self.client.post(
            reverse("auth-register"),
            {"email": "weak@example.com", "password": "123", "password_confirm": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="login@example.com", password=PASSWORD)

    def test_login_returns_access_token(self):
        response = self.client.post(
            reverse("auth-login"), {"email": "login@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("pai_refresh", response.cookies)

    def test_login_wrong_password(self):
        response = self.client.post(
            reverse("auth-login"), {"email": "login@example.com", "password": "wrong"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_suspended_user_cannot_login(self):
        self.user.is_suspended = True
        self.user.save()
        response = self.client.post(
            reverse("auth-login"), {"email": "login@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_requires_custom_header(self):
        login = self.client.post(
            reverse("auth-login"), {"email": "login@example.com", "password": PASSWORD}, format="json"
        )
        self.client.cookies = login.cookies
        # Without the CSRF-protection header the refresh is refused.
        response = self.client.post(reverse("auth-refresh"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(reverse("auth-refresh"), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_logout_clears_cookie(self):
        login = self.client.post(
            reverse("auth-login"), {"email": "login@example.com", "password": PASSWORD}, format="json"
        )
        self.client.cookies = login.cookies
        response = self.client.post(reverse("auth-logout"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies["pai_refresh"].value, "")


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="reset@example.com", password=PASSWORD)

    def test_request_sends_email_and_is_enumeration_safe(self):
        response = self.client.post(reverse("auth-password-reset"), {"email": "reset@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/reset-password?uid=", mail.outbox[0].body)

        # Unknown email returns the same 200.
        response = self.client.post(reverse("auth-password-reset"), {"email": "nobody@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_confirm_resets_password(self):
        self.client.post(reverse("auth-password-reset"), {"email": "reset@example.com"}, format="json")
        uid = self.client.session  # not used; extract from the email body instead
        body = mail.outbox[0].body
        import re

        match = re.search(r"uid=([^&]+)&token=([^\s]+)", body)
        self.assertIsNotNone(match)
        new_password = "An0ther-Str0ng!"
        response = self.client.post(
            reverse("auth-password-reset-confirm"),
            {
                "uid": match.group(1),
                "token": match.group(2),
                "password": new_password,
                "password_confirm": new_password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="me@example.com", password=PASSWORD)
        self.client.force_authenticate(self.user)

    def test_get_me(self):
        response = self.client.get(reverse("user-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me@example.com")

    def test_update_profile(self):
        response = self.client.patch(reverse("user-me"), {"first_name": "Ada", "headline": "Engineer"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Ada")

    def test_cannot_escalate_role_via_profile_update(self):
        response = self.client.patch(reverse("user-me"), {"role": UserRoles.ADMIN}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRoles.STUDENT)

    def test_change_password_requires_current(self):
        response = self.client.post(
            reverse("user-password-change"),
            {"current_password": "wrong", "new_password": "N3w-Str0ng-Pass!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            reverse("user-password-change"),
            {"current_password": PASSWORD, "new_password": "N3w-Str0ng-Pass!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("N3w-Str0ng-Pass!"))


class RolePermissionTests(APITestCase):
    def test_admin_permission_blocks_students(self):
        student = User.objects.create_user(email="s@example.com", password=PASSWORD, role=UserRoles.STUDENT)
        self.client.force_authenticate(student)
        response = self.client.get("/api/v1/admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_permission_allows_admins(self):
        admin = User.objects.create_user(email="a@example.com", password=PASSWORD, role=UserRoles.ADMIN)
        self.client.force_authenticate(admin)
        response = self.client.get("/api/v1/admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
