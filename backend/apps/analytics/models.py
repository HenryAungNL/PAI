"""Singleton platform settings editable from the custom admin dashboard."""
from django.core.cache import cache
from django.db import models


class PlatformSettings(models.Model):
    """A single row of platform configuration (pk=1)."""

    site_name = models.CharField(max_length=120, default="PAI")
    tagline = models.CharField(max_length=255, blank=True, default="Learn new skills, advance your career.")
    support_email = models.EmailField(default="support@pai.example.com")
    contact_phone = models.CharField(max_length=40, blank=True)
    contact_address = models.CharField(max_length=255, blank=True)
    twitter_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)
    terms_url = models.CharField(max_length=255, blank=True, default="/terms")
    privacy_url = models.CharField(max_length=255, blank=True, default="/privacy")
    refund_policy_url = models.CharField(max_length=255, blank=True, default="/refund-policy")
    # Feature flags
    allow_instructor_registration = models.BooleanField(default=True)
    stripe_test_mode = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platform settings"
        verbose_name_plural = "Platform settings"

    def __str__(self) -> str:
        return self.site_name

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete("platform_settings")

    @classmethod
    def load(cls) -> "PlatformSettings":
        cached = cache.get("platform_settings")
        if cached is not None:
            return cached
        obj, _ = cls.objects.get_or_create(pk=1)
        cache.set("platform_settings", obj, 60)
        return obj
