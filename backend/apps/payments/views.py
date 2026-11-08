"""Payment views: checkout creation, webhook receiver, order history."""
import logging

import stripe
from django.conf import settings
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPlatformAdmin
from apps.courses.models import Course
from apps.learning.models import Enrollment
from apps.payments.models import Order, OrderStatus
from apps.payments.serializers import CheckoutRequestSerializer, OrderSerializer, RefundRequestSerializer
from apps.payments.services import create_checkout_session, handle_webhook_event, process_refund, stripe_configured

logger = logging.getLogger(__name__)


class CreateCheckoutSessionView(APIView):
    """POST /api/v1/payments/checkout/

    Creates a pending order and a Stripe Checkout Session. The amount is always
    recalculated on the server from the course record.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not stripe_configured():
            return Response(
                {
                    "error": {
                        "code": "stripe_not_configured",
                        "message": "Payments are not configured on this server yet.",
                        "details": {},
                    }
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = CheckoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = Course.objects.filter(pk=serializer.validated_data["course_id"]).first()
        if course is None:
            return Response(
                {"error": {"code": "not_found", "message": "Course not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            result = create_checkout_session(request.user, course, request=request)
        except ValueError as exc:
            return Response(
                {"error": {"code": "checkout_error", "message": str(exc), "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except stripe.error.StripeError as exc:  # pragma: no cover - network dependent
            logger.warning("Stripe error creating checkout: %s", exc.__class__.__name__)
            return Response(
                {
                    "error": {
                        "code": "stripe_error",
                        "message": "We could not start the checkout. Please try again shortly.",
                        "details": {},
                    }
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(result, status=status.HTTP_201_CREATED)


class EnrollFreeCourseView(APIView):
    """POST /api/v1/payments/enroll-free/ — server-side enrollment for free courses."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = Course.objects.filter(pk=serializer.validated_data["course_id"]).first()
        if course is None:
            return Response(
                {"error": {"code": "not_found", "message": "Course not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if course.status != "published":
            return Response(
                {"error": {"code": "not_published", "message": "This course is not available.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if course.price_cents > 0:
            return Response(
                {
                    "error": {
                        "code": "payment_required",
                        "message": "This is a paid course. Please complete checkout.",
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        enrollment, created = Enrollment.objects.get_or_create(user=request.user, course=course)
        if created:
            Course.objects.filter(pk=course.id).update(enrollment_count=course.enrollment_count + 1)
        return Response({"detail": "You are enrolled.", "enrolled": True, "course_id": course.id}, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)


class StripeWebhookView(APIView):
    """POST /api/v1/payments/webhook/ — Stripe's signed webhook receiver.

    The signature is verified with STRIPE_WEBHOOK_SECRET. Events are processed
    idempotently, so duplicate deliveries are safe.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        if not settings.STRIPE_WEBHOOK_SECRET:
            logger.error("Webhook received but STRIPE_WEBHOOK_SECRET is not configured.")
            return Response({"error": "webhook_not_configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not sig_header:
            return Response({"error": "missing_signature"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except ValueError:
            return Response({"error": "invalid_payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            logger.warning("Rejected Stripe webhook with an invalid signature.")
            return Response({"error": "invalid_signature"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = handle_webhook_event(dict(event))
        except Exception:
            logger.exception("Failed to process webhook event")
            # Returning 500 asks Stripe to retry.
            return Response({"error": "processing_failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result, status=status.HTTP_200_OK)


class MyOrderListView(generics.ListAPIView):
    """GET /api/v1/my/orders/ — a student's own purchase history."""

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("course")
            .prefetch_related("payments", "refunds")
        )


class OrderStatusView(APIView):
    """GET /api/v1/my/orders/<order_id>/status/ — used by the success page to
    poll for verified payment. Never grants access on its own."""

    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = (
            Order.objects.filter(pk=order_id, user=request.user)
            .select_related("course")
            .prefetch_related("payments", "refunds")
            .first()
        )
        if order is None:
            return Response(
                {"error": {"code": "not_found", "message": "Order not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Include authenticated Stripe re-verification as a fallback for local dev
        # where webhooks may not be forwarded.
        if order.status == OrderStatus.PENDING and order.stripe_checkout_session_id and stripe_configured():
            _reconcile_pending_order(order)
            order.refresh_from_db()

        enrollment = Enrollment.objects.filter(user=request.user, course=order.course).first() if order.course_id else None
        return Response(
            {
                "order": OrderSerializer(order).data,
                "enrolled": enrollment is not None,
            }
        )


def _reconcile_pending_order(order):
    """Ask Stripe directly whether the checkout session was paid.

    This is a convenience for local development without webhook forwarding and
    is *only* trusted because Stripe — not the client — reports the payment.
    """
    try:
        session = stripe.checkout.Session.retrieve(order.stripe_checkout_session_id)
    except stripe.error.StripeError:  # pragma: no cover
        return
    if session.get("payment_status") in {"paid", "no_payment_required"}:
        from apps.payments.services import mark_order_paid

        mark_order_paid(
            order,
            payment_intent_id=session.get("payment_intent") or "",
            customer_id=session.get("customer") or "",
        )


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminOrderListView(generics.ListAPIView):
    """GET /api/v1/admin/orders/ — admin order/payment browser."""

    permission_classes = [IsPlatformAdmin]
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = Order.objects.select_related("user", "course").prefetch_related("payments", "refunds")
        params = self.request.query_params
        if status_filter := params.get("status"):
            qs = qs.filter(status=status_filter)
        if search := params.get("search"):
            qs = qs.filter(Q(course_title__icontains=search) | Q(user__email__icontains=search))
        return qs


class AdminRefundCreateView(APIView):
    """POST /api/v1/admin/orders/<order_id>/refund/ — user-initiated refund."""

    permission_classes = [IsPlatformAdmin]

    def post(self, request, order_id):
        order = Order.objects.filter(pk=order_id).first()
        if order is None:
            return Response(
                {"error": {"code": "not_found", "message": "Order not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = RefundRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refund = process_refund(
                order,
                serializer.validated_data["amount_cents"],
                serializer.validated_data.get("reason", ""),
                request.user,
            )
        except ValueError as exc:
            return Response(
                {"error": {"code": "refund_error", "message": str(exc), "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.payments.serializers import RefundSerializer

        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)
