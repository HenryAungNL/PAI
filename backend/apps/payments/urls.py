from django.urls import path

from apps.payments.views import (
    AdminOrderListView,
    AdminRefundCreateView,
    CreateCheckoutSessionView,
    EnrollFreeCourseView,
    MyOrderListView,
    OrderStatusView,
    StripeWebhookView,
)

urlpatterns = [
    # Student
    path("payments/checkout/", CreateCheckoutSessionView.as_view(), name="payment-checkout"),
    path("payments/enroll-free/", EnrollFreeCourseView.as_view(), name="payment-enroll-free"),
    path("payments/webhook/", StripeWebhookView.as_view(), name="payment-webhook"),
    path("my/orders/", MyOrderListView.as_view(), name="my-orders"),
    path("my/orders/<int:order_id>/status/", OrderStatusView.as_view(), name="my-order-status"),
    # Admin
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-orders"),
    path("admin/orders/<int:order_id>/refund/", AdminRefundCreateView.as_view(), name="admin-order-refund"),
]
