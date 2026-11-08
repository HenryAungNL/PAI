"""Tests for the Stripe payment lifecycle.

Stripe network calls are mocked. Signature verification and idempotency are
tested against the real `stripe` library helpers where possible.
"""
import json
from unittest import mock

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.testing import make_admin, make_course, make_instructor, make_user
from apps.courses.models import CourseStatus
from apps.learning.models import Enrollment
from apps.payments.models import Order, OrderStatus, Payment, Refund, WebhookEvent
from apps.payments.services import handle_webhook_event, mark_order_paid, process_refund

PASSWORD = "Str0ng-Passw0rd!"


def fake_session(session_id="cs_test_123", url="https://checkout.stripe.com/pay/cs_test_123"):
    return mock.Mock(id=session_id, url=url, customer="cus_test_1")


@override_settings(STRIPE_SECRET_KEY="sk_test_dummy")
class CheckoutCreationTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, price_cents=4999, status=CourseStatus.PUBLISHED)
        self.student = make_user("student@example.com")
        self.client.force_authenticate(self.student)

    @mock.patch("apps.payments.services.stripe.checkout.Session.create")
    def test_checkout_creates_pending_order_with_server_price(self, mock_create):
        mock_create.return_value = fake_session()
        response = self.client.post(
            "/api/v1/payments/checkout/", {"course_id": self.course.id, "amount_cents": 1}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(pk=response.data["order_id"])
        self.assertEqual(order.status, OrderStatus.PENDING)
        # Price comes from the course, never the client.
        self.assertEqual(order.amount_cents, 4999)
        self.assertFalse(Enrollment.objects.filter(user=self.student, course=self.course).exists())

    @mock.patch("apps.payments.services.stripe.checkout.Session.create")
    def test_checkout_rejected_for_unpublished_course(self, mock_create):
        draft = make_course(self.instructor, status=CourseStatus.DRAFT, title="Draft Purchase")
        response = self.client.post("/api/v1/payments/checkout/", {"course_id": draft.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_create.assert_not_called()

    def test_checkout_rejected_for_free_course(self):
        free = make_course(self.instructor, price_cents=0, title="Freebie")
        response = self.client.post("/api/v1/payments/checkout/", {"course_id": free.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @mock.patch("apps.payments.services.stripe.checkout.Session.create")
    def test_checkout_rejected_when_already_enrolled(self, mock_create):
        Enrollment.objects.create(user=self.student, course=self.course)
        response = self.client.post("/api/v1/payments/checkout/", {"course_id": self.course.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_create.assert_not_called()

    def test_anonymous_cannot_checkout(self):
        self.client.force_authenticate(None)
        response = self.client.post("/api/v1/payments/checkout/", {"course_id": self.course.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(STRIPE_SECRET_KEY="")
    def test_checkout_returns_503_when_stripe_unconfigured(self):
        response = self.client.post("/api/v1/payments/checkout/", {"course_id": self.course.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class MarkOrderPaidTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, price_cents=2999)
        self.student = make_user("student@example.com")
        self.order = Order.objects.create(
            user=self.student,
            course=self.course,
            course_title=self.course.title,
            amount_cents=2999,
            currency="usd",
            status=OrderStatus.PENDING,
        )

    def test_mark_paid_creates_enrollment_and_payment(self):
        mark_order_paid(self.order, payment_intent_id="pi_1")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PAID)
        self.assertIsNotNone(self.order.paid_at)
        self.assertTrue(Enrollment.objects.filter(user=self.student, course=self.course).exists())
        self.assertTrue(Payment.objects.filter(order=self.order).exists())

        self.course.refresh_from_db()
        self.assertEqual(self.course.enrollment_count, 1)

    def test_mark_paid_is_idempotent(self):
        mark_order_paid(self.order, payment_intent_id="pi_1")
        mark_order_paid(self.order, payment_intent_id="pi_1")
        self.assertEqual(Enrollment.objects.filter(user=self.student, course=self.course).count(), 1)
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)


@override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
class WebhookTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, price_cents=1999)
        self.student = make_user("student@example.com")
        self.order = Order.objects.create(
            user=self.student,
            course=self.course,
            course_title=self.course.title,
            amount_cents=1999,
            currency="usd",
            status=OrderStatus.PENDING,
            stripe_checkout_session_id="cs_test_1",
        )

    def _event(self, event_id="evt_1", event_type="checkout.session.completed"):
        return {
            "id": event_id,
            "type": event_type,
            "data": {
                "object": {
                    "id": "cs_test_1",
                    "payment_status": "paid",
                    "payment_intent": "pi_test_1",
                    "customer": "cus_1",
                    "metadata": {"order_id": str(self.order.id)},
                }
            },
        }

    @mock.patch("apps.payments.views.stripe.Webhook.construct_event")
    def test_completed_session_grants_enrollment(self, mock_construct):
        mock_construct.return_value = self._event()
        response = self.client.post(
            "/api/v1/payments/webhook/",
            data=json.dumps({"id": "evt_1"}),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=fake",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PAID)
        self.assertTrue(Enrollment.objects.filter(user=self.student, course=self.course).exists())

    @mock.patch("apps.payments.views.stripe.Webhook.construct_event")
    def test_duplicate_event_is_idempotent(self, mock_construct):
        mock_construct.return_value = self._event()
        for _ in range(2):
            self.client.post(
                "/api/v1/payments/webhook/",
                data=json.dumps({"id": "evt_1"}),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="t=1,v1=fake",
            )
        self.assertEqual(WebhookEvent.objects.filter(event_id="evt_1").count(), 1)
        self.assertEqual(Enrollment.objects.filter(user=self.student, course=self.course).count(), 1)

    @mock.patch("apps.payments.views.stripe.Webhook.construct_event")
    def test_unpaid_session_does_not_grant_access(self, mock_construct):
        event = self._event()
        event["data"]["object"]["payment_status"] = "unpaid"
        mock_construct.return_value = event
        self.client.post(
            "/api/v1/payments/webhook/",
            data=json.dumps({"id": "evt_unpaid"}),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=fake",
        )
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PENDING)
        self.assertFalse(Enrollment.objects.filter(user=self.student, course=self.course).exists())

    @mock.patch("apps.payments.views.stripe.Webhook.construct_event")
    def test_expired_session_marks_order_expired(self, mock_construct):
        event = self._event(event_id="evt_exp", event_type="checkout.session.expired")
        event["data"]["object"]["payment_status"] = "unpaid"
        mock_construct.return_value = event
        self.client.post(
            "/api/v1/payments/webhook/",
            data=json.dumps({"id": "evt_exp"}),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=fake",
        )
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.EXPIRED)

    def test_webhook_requires_signature_header(self):
        response = self.client.post(
            "/api/v1/payments/webhook/", data="{}", content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @mock.patch("apps.payments.views.stripe.Webhook.construct_event")
    def test_invalid_signature_rejected(self, mock_construct):
        import stripe

        mock_construct.side_effect = stripe.error.SignatureVerificationError("bad", "sig")
        response = self.client.post(
            "/api/v1/payments/webhook/",
            data=json.dumps({"id": "evt_bad"}),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=bad",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PENDING)

    @override_settings(STRIPE_WEBHOOK_SECRET="")
    def test_webhook_503_when_secret_missing(self):
        response = self.client.post(
            "/api/v1/payments/webhook/",
            data=json.dumps({"id": "evt_x"}),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=x",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class RefundTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, price_cents=5000)
        self.student = make_user("student@example.com")
        self.admin = make_admin()
        self.order = Order.objects.create(
            user=self.student,
            course=self.course,
            course_title=self.course.title,
            amount_cents=5000,
            currency="usd",
            status=OrderStatus.PAID,
            stripe_payment_intent_id="pi_refund",
        )
        Enrollment.objects.create(user=self.student, course=self.course)

    @override_settings(STRIPE_SECRET_KEY="sk_test_dummy")
    @mock.patch("apps.payments.services.stripe.Refund.create")
    def test_partial_refund_keeps_enrollment(self, mock_refund):
        mock_refund.return_value = mock.Mock(id="re_1", status="succeeded")
        refund = process_refund(self.order, 2000, "partial", self.admin)
        self.order.refresh_from_db()
        self.assertEqual(refund.status, "succeeded")
        self.assertEqual(self.order.refunded_amount_cents, 2000)
        self.assertEqual(self.order.status, OrderStatus.PARTIALLY_REFUNDED)
        self.assertEqual(self.order.net_amount_cents, 3000)
        self.assertTrue(Enrollment.objects.filter(user=self.student, course=self.course).exists())

    @override_settings(STRIPE_SECRET_KEY="sk_test_dummy")
    @mock.patch("apps.payments.services.stripe.Refund.create")
    def test_full_refund_revokes_enrollment(self, mock_refund):
        mock_refund.return_value = mock.Mock(id="re_2", status="succeeded")
        process_refund(self.order, 5000, "full", self.admin)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.REFUNDED)
        self.assertEqual(self.order.net_amount_cents, 0)
        self.assertFalse(Enrollment.objects.filter(user=self.student, course=self.course).exists())

    @override_settings(STRIPE_SECRET_KEY="sk_test_dummy")
    def test_refund_cannot_exceed_amount(self):
        with self.assertRaises(ValueError):
            process_refund(self.order, 99999, "too much", self.admin)

    def test_non_admin_cannot_refund(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/v1/admin/orders/{self.order.id}/refund/", {"amount_cents": 100}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ChargeRefundedWebhookTests(APITestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.course = make_course(self.instructor, price_cents=4000)
        self.student = make_user("student@example.com")
        self.order = Order.objects.create(
            user=self.student,
            course=self.course,
            course_title=self.course.title,
            amount_cents=4000,
            currency="usd",
            status=OrderStatus.PAID,
            stripe_payment_intent_id="pi_dash",
        )

    def test_dashboard_refund_is_synced(self):
        handle_webhook_event(
            {
                "id": "evt_charge_refund",
                "type": "charge.refunded",
                "data": {"object": {"id": "ch_1", "payment_intent": "pi_dash", "amount_refunded": 4000}},
            }
        )
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.REFUNDED)
        self.assertEqual(self.order.refunded_amount_cents, 4000)
        self.assertEqual(Refund.objects.filter(order=self.order).count(), 1)


class OrderHistoryTests(APITestCase):
    def test_student_sees_only_their_orders(self):
        instructor = make_instructor()
        course = make_course(instructor)
        student = make_user("student@example.com")
        other = make_user("other@example.com")
        Order.objects.create(user=student, course=course, course_title="A", amount_cents=100)
        Order.objects.create(user=other, course=course, course_title="B", amount_cents=100)

        self.client.force_authenticate(student)
        response = self.client.get("/api/v1/my/orders/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course_title"], "A")
