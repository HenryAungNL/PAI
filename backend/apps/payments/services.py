"""Stripe integration services.

Design rules:
* The order amount always comes from the course record — never the client.
* Enrollment is granted only after a *verified, signed* webhook confirms payment.
* Webhook handling is idempotent (WebhookEvent unique on event id) and safe to
  replay.
"""
from __future__ import annotations

import logging

import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.audit.utils import log_event
from apps.courses.models import Course
from apps.learning.models import Enrollment
from apps.payments.models import (
    Order,
    OrderStatus,
    Payment,
    Refund,
    RefundStatus,
    WebhookEvent,
)

logger = logging.getLogger(__name__)


def stripe_configured() -> bool:
    return bool(settings.STRIPE_SECRET_KEY)


def _client():
    if not stripe_configured():
        raise RuntimeError(
            "Stripe is not configured. Set STRIPE_SECRET_KEY (and the other "
            "STRIPE_* variables) before using payments."
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def create_checkout_session(user, course: Course, request=None) -> dict:
    """Create a pending order + Stripe Checkout Session for `course`.

    Returns a dict with the checkout url and the order id.
    """
    client = _client()

    if course.status != "published":
        raise ValueError("Only published courses can be purchased.")
    if course.price_cents <= 0:
        raise ValueError("This course is free — enroll directly instead.")
    if Enrollment.objects.filter(user=user, course=course).exists():
        raise ValueError("You are already enrolled in this course.")

    # Server-authoritative amount.
    order = Order.objects.create(
        user=user,
        course=course,
        course_title=course.title,
        amount_cents=course.price_cents,
        currency=course.currency.lower(),
        status=OrderStatus.PENDING,
    )

    success_url = f"{settings.SITE_URL}/payment/success?order={order.id}&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.SITE_URL}/payment/cancel?order={order.id}"

    session = client.checkout.Session.create(
        mode="payment",
        customer_email=user.email,
        line_items=[
            {
                "price_data": {
                    "currency": course.currency.lower(),
                    "unit_amount": course.price_cents,
                    "product_data": {
                        "name": course.title,
                        "description": course.subtitle or None,
                    },
                },
                "quantity": 1,
            }
        ],
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(order.id),
        metadata={
            "order_id": str(order.id),
            "user_id": str(user.id),
            "course_id": str(course.id),
        },
    )

    order.stripe_checkout_session_id = session.id
    if getattr(session, "customer", None):
        order.stripe_customer_id = session.customer
    order.save(update_fields=["stripe_checkout_session_id", "stripe_customer_id", "updated_at"])

    log_event(
        actor=user,
        action="payment.checkout_created",
        obj=order,
        metadata={"course_id": course.id, "amount_cents": order.amount_cents, "currency": order.currency},
        request=request,
    )
    return {"url": session.url, "order_id": order.id, "session_id": session.id}


@transaction.atomic
def mark_order_paid(order: Order, *, payment_intent_id: str = "", charge_id: str = "", customer_id: str = ""):
    """Idempotently mark an order paid and grant enrollment."""
    order = Order.objects.select_for_update().get(pk=order.pk)

    if order.status == OrderStatus.PAID:
        return order

    order.status = OrderStatus.PAID
    order.paid_at = order.paid_at or timezone.now()
    if payment_intent_id:
        order.stripe_payment_intent_id = payment_intent_id
    if customer_id:
        order.stripe_customer_id = customer_id
    order.save(
        update_fields=[
            "status",
            "paid_at",
            "stripe_payment_intent_id",
            "stripe_customer_id",
            "updated_at",
        ]
    )

    Payment.objects.get_or_create(
        order=order,
        stripe_payment_intent_id=payment_intent_id or "",
        defaults={
            "amount_cents": order.amount_cents,
            "currency": order.currency,
            "stripe_charge_id": charge_id,
            "status": "succeeded",
        },
    )

    enrollment = None
    if order.course_id:
        enrollment, created = Enrollment.objects.get_or_create(user=order.user, course=order.course)
        if created:
            Course.objects.filter(pk=order.course_id).update(
                enrollment_count=models_f_increment()
            )
    log_event(
        actor=order.user,
        action="payment.order_paid",
        obj=order,
        metadata={"amount_cents": order.amount_cents, "currency": order.currency, "enrollment_id": getattr(enrollment, "id", None)},
    )
    return order


def models_f_increment():
    from django.db.models import F

    return F("enrollment_count") + 1


@transaction.atomic
def process_refund(order: Order, amount_cents: int, reason: str, actor) -> Refund:
    """Refund an order (fully or partially) via Stripe and update records."""
    client = _client()

    if amount_cents <= 0:
        raise ValueError("Refund amount must be greater than zero.")
    remaining = order.amount_cents - order.refunded_amount_cents
    if amount_cents > remaining:
        raise ValueError("Refund amount exceeds the remaining refundable balance.")
    if not order.stripe_payment_intent_id:
        raise ValueError("This order has no associated payment to refund.")

    refund = Refund.objects.create(
        order=order,
        amount_cents=amount_cents,
        currency=order.currency,
        reason=reason,
        status=RefundStatus.PENDING,
        created_by=actor,
    )

    stripe_refund = client.Refund.create(
        payment_intent=order.stripe_payment_intent_id,
        amount=amount_cents,
        reason="requested_by_customer",
        metadata={"order_id": str(order.id), "refund_id": str(refund.id)},
    )

    refund.stripe_refund_id = stripe_refund.id
    refund.status = RefundStatus.SUCCEEDED if stripe_refund.status == "succeeded" else RefundStatus.PENDING
    refund.save(update_fields=["stripe_refund_id", "status", "updated_at"])

    order.refunded_amount_cents += amount_cents
    order.status = (
        OrderStatus.REFUNDED if order.refunded_amount_cents >= order.amount_cents else OrderStatus.PARTIALLY_REFUNDED
    )
    order.save(update_fields=["refunded_amount_cents", "status", "updated_at"])

    # A full refund revokes access.
    if order.status == OrderStatus.REFUNDED and order.course_id:
        Enrollment.objects.filter(user=order.user, course_id=order.course_id).delete()
        Course.objects.filter(pk=order.course_id).update(enrollment_count=models_max_zero_decrement())

    log_event(
        actor=actor,
        action="payment.refund_issued",
        obj=refund,
        metadata={"order_id": order.id, "amount_cents": amount_cents, "currency": order.currency},
    )
    return refund


def models_max_zero_decrement():
    from django.db.models import F, Value
    from django.db.models.functions import Greatest

    return Greatest(F("enrollment_count") - 1, Value(0))


def handle_webhook_event(event: dict) -> dict:
    """Dispatch a verified Stripe event. Returns a summary dict."""
    event_id = event.get("id", "")
    event_type = event.get("type", "")

    if not event_id:
        raise ValueError("Event is missing an id.")

    with transaction.atomic():
        _, created = WebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})
        if not created:
            logger.info("Duplicate webhook %s ignored", event_id)
            return {"status": "duplicate", "event_id": event_id}

    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data, event_id)

    elif event_type in {"checkout.session.expired", "checkout.session.async_payment_failed"}:
        _handle_session_expired(data, event_type)

    elif event_type in {"charge.refunded", "charge.refund.updated"}:
        _handle_charge_refunded(data, event_id)

    elif event_type == "payment_intent.payment_failed":
        _handle_payment_failed(data, event_id)

    return {"status": "processed", "event_id": event_id, "event_type": event_type}


def _order_from_session(data) -> Order | None:
    metadata = data.get("metadata") or {}
    order_id = metadata.get("order_id") or data.get("client_reference_id")
    if not order_id:
        return None
    return Order.objects.filter(pk=order_id).first()


def _handle_checkout_completed(data, event_id):
    order = _order_from_session(data)
    if order is None:
        logger.warning("checkout.session.completed for unknown order (event %s)", event_id)
        return
    payment_status = data.get("payment_status")
    if payment_status not in {"paid", "no_payment_required"}:
        logger.info("Session %s completed but payment_status=%s", data.get("id"), payment_status)
        return
    mark_order_paid(
        order,
        payment_intent_id=data.get("payment_intent") or "",
        customer_id=data.get("customer") or "",
    )


def _handle_session_expired(data, event_type):
    order = _order_from_session(data)
    if order is None or order.status != OrderStatus.PENDING:
        return
    status = OrderStatus.EXPIRED if event_type == "checkout.session.expired" else OrderStatus.FAILED
    order.status = status
    order.save(update_fields=["status", "updated_at"])


def _handle_payment_failed(data, event_id):
    metadata = data.get("metadata") or {}
    order_id = metadata.get("order_id")
    if not order_id:
        return
    Order.objects.filter(pk=order_id, status=OrderStatus.PENDING).update(status=OrderStatus.FAILED)


def _handle_charge_refunded(data, event_id):
    """Sync refunds initiated from the Stripe dashboard."""
    payment_intent = data.get("payment_intent")
    if not payment_intent:
        return
    order = Order.objects.filter(stripe_payment_intent_id=payment_intent).first()
    if order is None:
        return
    refunded_total = data.get("amount_refunded") or 0
    if refunded_total <= order.refunded_amount_cents:
        return
    delta = refunded_total - order.refunded_amount_cents
    order.refunded_amount_cents = refunded_total
    order.status = (
        OrderStatus.REFUNDED if refunded_total >= order.amount_cents else OrderStatus.PARTIALLY_REFUNDED
    )
    order.save(update_fields=["refunded_amount_cents", "status", "updated_at"])
    Refund.objects.create(
        order=order,
        amount_cents=delta,
        currency=order.currency,
        reason="Refunded via Stripe dashboard",
        status=RefundStatus.SUCCEEDED,
        stripe_refund_id=data.get("id") or "",
    )
    log_event(
        action="payment.refund_synced_from_stripe",
        obj=order,
        metadata={"amount_cents": delta, "event_id": event_id},
    )
