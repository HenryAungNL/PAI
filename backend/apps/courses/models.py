from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class CourseStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING = "pending", "Pending review"
    PUBLISHED = "published", "Published"
    REJECTED = "rejected", "Rejected"
    ARCHIVED = "archived", "Archived"


class Difficulty(models.TextChoices):
    BEGINNER = "beginner", "Beginner"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=60, blank=True, help_text="Lucide icon name")
    image_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:140]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Course(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses_taught",
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses"
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=230, unique=True, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    learning_objectives = models.JSONField(default=list, blank=True)
    requirements = models.JSONField(default=list, blank=True)
    difficulty = models.CharField(
        max_length=20, choices=Difficulty.choices, default=Difficulty.BEGINNER
    )
    price_cents = models.PositiveIntegerField(
        default=0, validators=[MinValueValidator(0)], help_text="Price in minor currency units"
    )
    currency = models.CharField(max_length=3, default="usd")
    thumbnail = models.ImageField(upload_to="course_thumbnails/", blank=True, null=True)
    thumbnail_url = models.URLField(
        blank=True, help_text="Fallback remote image used when no upload is present"
    )
    promo_video_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=CourseStatus.choices, default=CourseStatus.DRAFT)
    moderation_note = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    # Denormalised aggregates kept in sync by signals / services.
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    enrollment_count = models.PositiveIntegerField(default=0)
    lesson_count = models.PositiveIntegerField(default=0)
    total_duration_minutes = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["category", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:200]
            slug = base
            counter = 2
            while Course.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        if self.status == CourseStatus.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title

    @property
    def is_free(self) -> bool:
        return self.price_cents == 0

    @property
    def display_price(self) -> str:
        return "Free" if self.is_free else f"${self.price_cents / 100:.2f}"

    def recompute_aggregates(self, save: bool = True):
        lessons = Lesson.objects.filter(section__course=self)
        self.lesson_count = lessons.count()
        self.total_duration_minutes = (
            lessons.aggregate(total=models.Sum("duration_minutes"))["total"] or 0
        )
        if save:
            self.save(update_fields=["lesson_count", "total_duration_minutes", "updated_at"])


class CourseSection(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["course", "order"], name="unique_section_order_per_course")
        ]

    def __str__(self) -> str:
        return f"{self.course.title} · {self.title}"


class Lesson(models.Model):
    section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    content = models.TextField(blank=True, help_text="Rich text or notes rendered above the video")
    video_url = models.URLField(
        blank=True, help_text="External video URL (HLS/MP4/YouTube/Vimeo embed)"
    )
    attachment = models.FileField(upload_to="lesson_attachments/", blank=True, null=True)
    duration_minutes = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    is_preview = models.BooleanField(
        default=False, help_text="Preview lessons are viewable without enrollment"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["section", "order"], name="unique_lesson_order_per_section")
        ]
        indexes = [models.Index(fields=["section", "order"])]

    @property
    def course(self) -> Course:
        return self.section.course

    def __str__(self) -> str:
        return self.title
