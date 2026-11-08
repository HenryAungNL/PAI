from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserRoles(models.TextChoices):
    STUDENT = "student", "Student"
    INSTRUCTOR = "instructor", "Instructor"
    ADMIN = "admin", "Administrator"


class UserManager(BaseUserManager):
    """Manager for the email-based user model."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRoles.ADMIN)
        extra_fields.setdefault("is_approved", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """PAI's custom user. Email is the identifier; a username is not used."""

    email = models.EmailField("email address", unique=True)
    username = None  # dropped in favour of email login
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)

    role = models.CharField(
        max_length=20, choices=UserRoles.choices, default=UserRoles.STUDENT
    )
    # Instructors need admin approval before they may publish; admins are always approved.
    is_approved = models.BooleanField(default=True)
    # Suspended accounts can log in nowhere.
    is_suspended = models.BooleanField(default=False)
    suspension_reason = models.TextField(blank=True)

    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    avatar_url = models.URLField(
        blank=True, help_text="Remote portrait used when no upload is present"
    )
    headline = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["is_suspended"]),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.email

    @property
    def is_student(self) -> bool:
        return self.role == UserRoles.STUDENT

    @property
    def is_instructor(self) -> bool:
        return self.role == UserRoles.INSTRUCTOR

    @property
    def is_pai_admin(self) -> bool:
        return self.role == UserRoles.ADMIN or self.is_superuser

    def clean(self):
        # Promote platform admins to staff so the emergency Django admin works,
        # without making every instructor a staff member.
        if self.role == UserRoles.ADMIN:
            self.is_staff = True
            self.is_approved = True
