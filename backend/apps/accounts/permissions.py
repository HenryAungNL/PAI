"""Reusable permission classes for role-based and object-level access control."""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import UserRoles


class IsStudent(BasePermission):
    message = "Only students may perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRoles.STUDENT)


class IsInstructor(BasePermission):
    message = "Only instructors may perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRoles.INSTRUCTOR
        )


class IsPlatformAdmin(BasePermission):
    message = "Administrator privileges are required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == UserRoles.ADMIN or user.is_superuser))


class IsOwnerOrReadOnly(BasePermission):
    """Object-level: owners may modify, everyone else gets read-only."""

    owner_field = "owner"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, self.owner_field, None)
        if owner is None and hasattr(obj, "course"):
            owner = getattr(obj.course, self.owner_field, None)
        if owner is None and hasattr(obj, "section"):
            owner = getattr(obj.section.course, self.owner_field, None)
        return owner == request.user


class IsInstructorOwnerOrReadOnly(IsOwnerOrReadOnly):
    message = "You may only modify your own courses."


class IsSelfOrAdmin(BasePermission):
    """Object-level: the user themselves or a platform administrator."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == UserRoles.ADMIN or user.is_superuser:
            return True
        return obj == user or getattr(obj, "user_id", None) == user.id
