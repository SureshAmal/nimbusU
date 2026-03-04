"""Serializers for the accounts app."""

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import AuditLog, FacultyProfile, StudentProfile

User = get_user_model()


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = [
            "id", "student_id_number", "roll_no", "register_no", "program",
            "current_semester", "admission_date", "batch_year",
            "batch", "division",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "student_id_number": {"validators": []},
            "roll_no": {"validators": []},
            "register_no": {"validators": []},
        }


class FacultyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacultyProfile
        fields = [
            "id", "employee_id", "designation",
            "specialization", "joining_date", "consultation_hours",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "employee_id": {"validators": []},
        }


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for listings."""

    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )
    school_name = serializers.CharField(
        source="department.school.name", read_only=True, default=None
    )
    program_name = serializers.SerializerMethodField()
    student_profile = StudentProfileSerializer(required=False, allow_null=True)
    faculty_profile = FacultyProfileSerializer(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role",
            "department", "department_name", "school_name", "program_name",
            "profile_picture", "phone",
            "is_active", "last_login", "created_at",
            "student_profile", "faculty_profile",
        ]
        read_only_fields = ["id", "created_at", "last_login"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_program_name(self, obj):
        profile = getattr(obj, "student_profile", None)
        if profile and profile.program:
            return profile.program.name
        return None



class UserDetailSerializer(serializers.ModelSerializer):
    """Full user serializer with profile details."""

    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )
    school_name = serializers.CharField(
        source="department.school.name", read_only=True, default=None
    )
    program_name = serializers.SerializerMethodField()
    student_profile = StudentProfileSerializer(required=False, allow_null=True)
    faculty_profile = FacultyProfileSerializer(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role",
            "department", "department_name", "school_name", "program_name",
            "profile_picture",
            "phone", "is_active", "failed_login_attempts",
            "last_login", "created_at", "updated_at",
            "student_profile", "faculty_profile",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "last_login"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_program_name(self, obj):
        profile = getattr(obj, "student_profile", None)
        if profile and profile.program:
            return profile.program.name
        return None

    def update(self, instance, validated_data):
        student_data = validated_data.pop("student_profile", None)
        faculty_data = validated_data.pop("faculty_profile", None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create student profile
        if instance.role == "student" and student_data is not None:
            StudentProfile.objects.update_or_create(user=instance, defaults=student_data)
            
        # Update or create faculty profile for faculty, deans, and heads
        if instance.role in ("faculty", "dean", "head") and faculty_data is not None:
            FacultyProfile.objects.update_or_create(user=instance, defaults=faculty_data)
            
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users (admin only)."""

    password = serializers.CharField(write_only=True, min_length=8)
    student_profile = StudentProfileSerializer(required=False, allow_null=True)
    faculty_profile = FacultyProfileSerializer(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "password", "first_name", "last_name",
            "role", "department", "phone", "student_profile", "faculty_profile"
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        student_data = validated_data.pop("student_profile", None)
        faculty_data = validated_data.pop("faculty_profile", None)
        password = validated_data.pop("password")
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        if user.role == "student" and student_data:
            StudentProfile.objects.create(user=user, **student_data)
        elif user.role in ("faculty", "dean", "head") and faculty_data:
            FacultyProfile.objects.create(user=user, **faculty_data)
            
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


class UserBulkCreateSerializer(serializers.Serializer):
    """Serializer for bulk creating users via JSON."""
    
    users = UserCreateSerializer(many=True)

    def create(self, validated_data):
        users_data = validated_data.pop("users")
        created_users = []
        
        # Using a transaction to ensure all or nothing
        from django.db import transaction
        with transaction.atomic():
            for user_data in users_data:
                student_data = user_data.pop("student_profile", None)
                faculty_data = user_data.pop("faculty_profile", None)
                password = user_data.pop("password")
                
                user = User(**user_data)
                user.set_password(password)
                user.save()
                
                if user.role == "student" and student_data:
                    StudentProfile.objects.create(user=user, **student_data)
                elif user.role in ("faculty", "dean", "head") and faculty_data:
                    FacultyProfile.objects.create(user=user, **faculty_data)
                    
                created_users.append(user)
                
        return created_users


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
