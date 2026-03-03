"""Shared permissions for role-based access control."""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsFaculty(BasePermission):
    """Allow access only to faculty users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("faculty", "dean", "head")
        )


class IsStudent(BasePermission):
    """Allow access only to student users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )


class IsAdminOrFaculty(BasePermission):
    """Allow access to admin or faculty users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "faculty", "dean", "head")
        )


class IsOwnerOrAdmin(BasePermission):
    """Allow access to the object owner or admin users."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        # Check common owner field names
        for attr in ("uploaded_by", "created_by", "author", "user"):
            owner = getattr(obj, attr, None)
            if owner is not None:
                return owner == request.user
        return False
