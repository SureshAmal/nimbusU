import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):
    """Custom user manager using email as the unique identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model with UUID PK and role-based access."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        FACULTY = "faculty", "Faculty"
        DEAN = "dean", "Dean"
        HEAD = "head", "Faculty Head"
        STUDENT = "student", "Student"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=Role.choices)
    department = models.ForeignKey(
        "academics.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    profile_picture = models.ImageField(
        upload_to="avatars/", null=True, blank=True
    )
    phone = models.CharField(max_length=20, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def delete(self, *args, **kwargs):
        from django.utils import timezone
        self.is_active = False
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "is_deleted", "deleted_at"])

    def hard_delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)


class StudentProfile(models.Model):
    """Extended profile for students."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="student_profile"
    )
    student_id_number = models.CharField(max_length=50, unique=True)
    roll_no = models.CharField(max_length=50, unique=True, null=True, blank=True)
    register_no = models.CharField(max_length=50, unique=True, null=True, blank=True)
    program = models.ForeignKey(
        "academics.Program",
        on_delete=models.SET_NULL,
        null=True,
        related_name="students",
    )
    current_semester = models.IntegerField()
    admission_date = models.DateField()
    batch_year = models.IntegerField()
    batch = models.CharField(max_length=50, null=True, blank=True)
    division = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = "student_profiles"

    def __str__(self):
        return f"{self.user.full_name} - {self.student_id_number}"


class FacultyProfile(models.Model):
    """Extended profile for faculty members."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="faculty_profile"
    )
    employee_id = models.CharField(max_length=50, unique=True)
    designation = models.CharField(max_length=100)
    specialization = models.CharField(max_length=200, null=True, blank=True)
    joining_date = models.DateField()
    consultation_hours = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "faculty_profiles"

    def __str__(self):
        return f"{self.user.full_name} - {self.employee_id}"


class AuditLog(models.Model):
    """Audit trail for administrative actions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.UUIDField(null=True, blank=True)
    details = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.entity_type}"


class UserPreferences(models.Model):
    """Stores user specific UI/UX preferences."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="preferences"
    )
    theme = models.CharField(max_length=20, default="system", help_text="light, dark, or system")
    calendar_view = models.CharField(max_length=20, default="week", help_text="month, week, or day")
    compact_sidebar = models.BooleanField(default=False)
    language = models.CharField(max_length=10, default="en")
    timezone = models.CharField(max_length=50, default="asia_kolkata")
    date_format = models.CharField(max_length=20, default="dd_mm_yyyy")

    class Meta:
        db_table = "user_preferences"

    def __str__(self):
        return f"Preferences for {self.user.email}"

