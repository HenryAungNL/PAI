"""Payment models.

Money is always stored in integer minor units (cents) together with an
ISO-4217 currency. Client-supplied prices are never trusted: the order amount
is derived from the course record at checkout-creation time.
"""
from django.conf import settings
from django.db import models

from apps.courses.models import Course


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    EXPIRED = "expired", "Expired"
    REFUNDED = "refunded", "Refunded"
    PARTIALLY_REFUNDED = "partially_refunded", "Partially refunded"


class RefundStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"


class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, related_name="orders")
    # Snapshot of the course title so invoices survive course deletion.
    course_title = models.CharField(max_length=200)
    amount_cents = models.PositiveIntegerField()
    refunded_amount_cents = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=3, default="usd")
    status = models.CharField(max_length=24, choices=OrderStatus.choices, default=OrderStatus.PENDING)

    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"Order #{self.pk} · {self.course_title} · {self.status}"

    @property
    def net_amount_cents(self) -> int:
        return max(self.amount_cents - self.refunded_amount_cents, 0)

    @property
    def is_paid(self) -> bool:
        return self.status in {OrderStatus.PAID, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.REFUNDED}


class Payment(models.Model):
    """A successful charge associated with an order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    stripe_charge_id = models.CharField(max_length=255, blank=True)
    amount_cents = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="usd")
    status = models.CharField(max_length=32, default="succeeded")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Payment {self.pk} for order {self.order_id}"


class Refund(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="refunds")
    amount_cents = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="usd")
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=24, choices=RefundStatus.choices, default=RefundStatus.PENDING)
    stripe_refund_id = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="issued_refunds"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Refund {self.pk} · order {self.order_id}"


class WebhookEvent(models.Model):
    """Processed Stripe events, for idempotent webhook handling."""

    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=120)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-processed_at"]

    def __str__(self) -> str:
        return f"{self.event_type} ({self.event_id})"
