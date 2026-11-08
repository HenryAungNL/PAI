from django.contrib import admin

from apps.payments.models import Order, Payment, Refund, WebhookEvent


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


class RefundInline(admin.TabularInline):
    model = Refund
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "course_title", "amount_cents", "currency", "status", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["user__email", "course_title", "stripe_checkout_session_id", "stripe_payment_intent_id"]
    raw_id_fields = ["user", "course"]
    inlines = [PaymentInline, RefundInline]


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ["event_id", "event_type", "processed_at"]
    search_fields = ["event_id", "event_type"]
    readonly_fields = ["event_id", "event_type", "processed_at"]

    def has_add_permission(self, request):
        return False
