from django.urls import path

from apps.accounts.views import MeView, PasswordChangeView

urlpatterns = [
    path("me/", MeView.as_view(), name="user-me"),
    path("me/password/", PasswordChangeView.as_view(), name="user-password-change"),
]
