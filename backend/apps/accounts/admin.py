from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-created_at"]
    list_display = ["email", "first_name", "last_name", "role", "is_active", "is_suspended", "is_approved"]
    list_filter = ["role", "is_active", "is_suspended", "is_approved"]
    search_fields = ["email", "first_name", "last_name"]
    readonly_fields = ["created_at", "updated_at", "last_login", "date_joined"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "avatar", "headline", "bio")}),
        ("Roles & status", {"fields": ("role", "is_approved", "is_suspended", "suspension_reason")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "role", "password1", "password2"),
            },
        ),
    )
