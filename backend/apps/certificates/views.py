from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.certificates.models import Certificate
from apps.certificates.serializers import CertificateSerializer, PublicCertificateSerializer
from apps.certificates.services import is_eligible_for_certificate, issue_certificate
from apps.core.exceptions import APIError
from apps.learning.models import Enrollment


class MyCertificateListView(generics.ListAPIView):
    """GET /api/v1/my/certificates/"""

    permission_classes = [IsAuthenticated]
    serializer_class = CertificateSerializer
    pagination_class = None

    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user).select_related("course")


class IssueCertificateView(APIView):
    """POST /api/v1/my/courses/<course_id>/certificate/ — request issuance.

    The server verifies completion; the client cannot force issuance.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        enrollment = (
            Enrollment.objects.filter(user=request.user, course_id=course_id).select_related("course").first()
        )
        if enrollment is None:
            raise APIError(status.HTTP_403_FORBIDDEN, "You are not enrolled in this course.", code="not_enrolled")
        if not is_eligible_for_certificate(enrollment):
            raise APIError(
                status.HTTP_400_BAD_REQUEST,
                "Complete every lesson to earn your certificate.",
                code="not_eligible",
            )
        certificate = issue_certificate(enrollment)
        return Response(CertificateSerializer(certificate).data, status=status.HTTP_201_CREATED)


class CertificateVerifyView(APIView):
    """GET /api/v1/certificates/verify/<code>/ — public verification."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request, code):
        certificate = Certificate.objects.filter(code=code.upper()).select_related("course").first()
        if certificate is None:
            raise APIError(status.HTTP_404_NOT_FOUND, "No certificate matches that code.", code="not_found")
        return Response({"valid": True, "certificate": PublicCertificateSerializer(certificate).data})
