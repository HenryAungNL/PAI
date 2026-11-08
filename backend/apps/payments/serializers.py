"""Payment serializers."""
from rest_framework import serializers

from apps.payments.models import Order, Payment, Refund


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount_cents", "currency", "status", "stripe_payment_intent_id", "created_at"]


class RefundSerializer(serializers.ModelSerializer):
    issued_by = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = ["id", "order", "amount_cents", "currency", "reason", "status", "stripe_refund_id", "issued_by", "created_at"]

    def get_issued_by(self, obj):
        return obj.created_by.full_name if obj.created_by else "System"


class OrderSerializer(serializers.ModelSerializer):
    payments = PaymentSerializer(many=True, read_only=True)
    refunds = RefundSerializer(many=True, read_only=True)
    net_amount_cents = serializers.IntegerField(read_only=True)
    student = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "student",
            "course",
            "course_title",
            "amount_cents",
            "refunded_amount_cents",
            "net_amount_cents",
            "currency",
            "status",
            "stripe_payment_intent_id",
            "stripe_checkout_session_id",
            "paid_at",
            "created_at",
            "payments",
            "refunds",
        ]

    def get_student(self, obj):
        if not obj.user:
            return None
        return {"id": obj.user.id, "full_name": obj.user.full_name, "email": obj.user.email}


class CheckoutRequestSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()


class RefundRequestSerializer(serializers.Serializer):
    amount_cents = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=255, allow_blank=True, required=False, default="")
