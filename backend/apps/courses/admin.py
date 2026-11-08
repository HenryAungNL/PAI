from django.contrib import admin

from apps.courses.models import Category, Course, CourseSection, Lesson


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "order", "course_count"]
    list_editable = ["is_active", "order"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]

    @admin.display(description="Courses")
    def course_count(self, obj):
        return obj.courses.count()


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "category", "status", "price_cents", "enrollment_count", "created_at"]
    list_filter = ["status", "difficulty", "category", "is_featured"]
    search_fields = ["title", "description", "owner__email"]
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ["owner"]
    readonly_fields = ["average_rating", "review_count", "enrollment_count", "lesson_count", "total_duration_minutes", "created_at", "updated_at"]


@admin.register(CourseSection)
class CourseSectionAdmin(admin.ModelAdmin):
    list_display = ["title", "course", "order"]
    search_fields = ["title", "course__title"]
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ["title", "section", "order", "duration_minutes", "is_preview"]
    search_fields = ["title", "section__course__title"]
