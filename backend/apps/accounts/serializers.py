"""Serializers for accounts: registration, login, profile, password reset."""
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers

from apps.accounts.models import UserRoles

User = get_user_model()


def avatar_url(user, request=None) -> str | None:
    """Resolve the best available avatar: uploaded file, then remote URL."""
    if user.avatar:
        url = user.avatar.url
        return request.build_absolute_uri(url) if request is not None else url
    return user.avatar_url or None


class PublicUserSerializer(serializers.ModelSerializer):
    """Minimal, safe representation of a user for embedding elsewhere."""

    full_name = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "avatar", "headline", "bio", "role", "created_at"]

    def get_avatar(self, obj):
        return avatar_url(obj, self.context.get("request"))


class UserSerializer(serializers.ModelSerializer):
    """Full representation of the authenticated user's own account."""

    full_name = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_approved",
            "is_suspended",
            "avatar",
            "avatar_url",
            "headline",
            "bio",
            "date_joined",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "role", "is_approved", "is_suspended", "date_joined", "created_at", "updated_at"]

    def get_avatar(self, obj):
        url = avatar_url(obj, self.context.get("request"))
        return url

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=[UserRoles.STUDENT, UserRoles.INSTRUCTOR], default=UserRoles.STUDENT
    )

    class Meta:
        model = User
        fields = ["email", "password", "password_confirm", "first_name", "last_name", "role"]

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        role = validated_data.get("role", UserRoles.STUDENT)
        # Instructor accounts start unapproved and are reviewed by an administrator.
        is_approved = role != UserRoles.INSTRUCTOR
        user = User.objects.create_user(password=password, is_approved=is_approved, **validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        email = attrs.get("email", "").lower().strip()
        password = attrs.get("password")
        user = authenticate(request=self.context.get("request"), username=email, password=password)
        if user is None:
            raise serializers.ValidationError(
                {"detail": "Invalid email or password."}, code="invalid_credentials"
            )
        if user.is_suspended:
            raise serializers.ValidationError(
                {"detail": "This account has been suspended."}, code="account_suspended"
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account is inactive."}, code="account_inactive"
            )
        attrs["user"] = user
        return attrs


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "headline", "bio", "avatar", "avatar_url"]

    def validate_avatar(self, value):
        if value is None:
            return value
        max_bytes = 5 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError("Avatar must be smaller than 5 MB.")
        allowed = {"image/jpeg", "image/png", "image/webp"}
        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in allowed:
            raise serializers.ValidationError("Avatar must be a JPEG, PNG or WebP image.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(validators=[validate_password])
    password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError({"token": "This reset link is invalid."})
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "This reset link is invalid or has expired."})
        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["password"])
        user.save(update_fields=["password"])
        return user


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Your current password is incorrect.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


def build_password_reset_uid(user) -> str:
    return urlsafe_base64_encode(force_bytes(user.pk))


def build_password_reset_token(user) -> str:
    return default_token_generator.make_token(user)
