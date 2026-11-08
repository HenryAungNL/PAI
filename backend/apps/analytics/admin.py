from django.contrib import admin

from apps.analytics.models import PlatformSettings


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Brand", {"fields": ("site_name", "tagline")}),
        ("Contact", {"fields": ("support_email", "contact_phone", "contact_address")}),
        ("Social", {"fields": ("twitter_url", "linkedin_url", "instagram_url", "youtube_url", "facebook_url")}),
        ("Policies", {"fields": ("terms_url", "privacy_url", "refund_policy_url")}),
        ("Features", {"fields": ("allow_instructor_registration", "stripe_test_mode")}),
    )

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
