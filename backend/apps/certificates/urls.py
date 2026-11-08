from django.urls import path

from apps.certificates.views import (
    CertificateVerifyView,
    IssueCertificateView,
    MyCertificateListView,
)

urlpatterns = [
    path("my/certificates/", MyCertificateListView.as_view(), name="my-certificates"),
    path("my/courses/<int:course_id>/certificate/", IssueCertificateView.as_view(), name="issue-certificate"),
    path("certificates/verify/<str:code>/", CertificateVerifyView.as_view(), name="certificate-verify"),
]
