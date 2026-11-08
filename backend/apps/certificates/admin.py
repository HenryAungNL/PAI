from django.contrib import admin

from apps.certificates.models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ["code", "student_name", "course_title", "final_score_percent", "issued_at"]
    search_fields = ["code", "student_name", "course_title", "user__email"]
    readonly_fields = ["code", "issued_at"]
