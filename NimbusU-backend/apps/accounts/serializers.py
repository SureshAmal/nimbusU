"""Serializers for the accounts app."""

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import AuditLog, FacultyProfile, StudentProfile

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for listings."""

    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role",
            "department", "department_name", "phone",
            "is_active", "last_login", "created_at",
        ]
        read_only_fields = ["id", "created_at", "last_login"]


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = [
            "id", "student_id_number", "program",
            "current_semester", "admission_date", "batch_year",
        ]
        read_only_fields = ["id"]


class FacultyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacultyProfile
        fields = [
            "id", "employee_id", "designation",
            "specialization", "joining_date", "consultation_hours",
        ]
        read_only_fields = ["id"]


class UserDetailSerializer(serializers.ModelSerializer):
    """Full user serializer with profile details."""

    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )
    student_profile = serializers.SerializerMethodField()
    faculty_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role",
            "department", "department_name", "profile_picture",
            "phone", "is_active", "failed_login_attempts",
            "last_login", "created_at", "updated_at",
            "student_profile", "faculty_profile",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "last_login"]

    @extend_schema_field(StudentProfileSerializer(allow_null=True))
    def get_student_profile(self, obj) -> dict | None:
        if obj.role != "student":
            return None
        try:
            return StudentProfileSerializer(obj.student_profile).data
        except StudentProfile.DoesNotExist:
            return None

    @extend_schema_field(FacultyProfileSerializer(allow_null=True))
    def get_faculty_profile(self, obj) -> dict | None:
        if obj.role != "faculty":
            return None
        try:
            return FacultyProfileSerializer(obj.faculty_profile).data
        except FacultyProfile.DoesNotExist:
            return None


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users (admin only)."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id", "email", "password", "first_name", "last_name",
            "role", "department", "phone",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for self-registration."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "password", "password_confirm",
            "first_name", "last_name", "role",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""

    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for admin password reset."""

    new_password = serializers.CharField(min_length=8)


class LogoutSerializer(serializers.Serializer):
    """Serializer for logout."""

    refresh = serializers.CharField()


class AvatarUploadSerializer(serializers.Serializer):
    """Serializer for avatar upload."""

    avatar = serializers.ImageField()


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_email", "action",
            "entity_type", "entity_id", "details",
            "ip_address", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
