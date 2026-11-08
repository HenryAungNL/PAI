from django.urls import path

from apps.courses.instructor_views import InstructorDetailView, InstructorListView
from apps.courses.views import (
    CategoryListView,
    CourseDetailView,
    CourseListView,
    CourseOverviewListView,
    CourseArchiveView,
    CourseSubmitForReviewView,
    InstructorCourseDetailView,
    InstructorCourseListCreateView,
    LessonDetailView,
    LessonListCreateView,
    SectionDetailView,
    SectionListCreateView,
)

urlpatterns = [
    # Public catalog
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("courses/", CourseListView.as_view(), name="course-list"),
    path("courses/popular/", CourseOverviewListView.as_view(), name="course-popular"),
    path("courses/<slug:slug>/", CourseDetailView.as_view(), name="course-detail"),
    path("instructors/", InstructorListView.as_view(), name="instructor-list"),
    path("instructors/<int:pk>/", InstructorDetailView.as_view(), name="instructor-detail"),
    # Instructor authoring
    path("instructor/courses/", InstructorCourseListCreateView.as_view(), name="instructor-course-list"),
    path("instructor/courses/<int:pk>/", InstructorCourseDetailView.as_view(), name="instructor-course-detail"),
    path("instructor/courses/<int:pk>/submit/", CourseSubmitForReviewView.as_view(), name="instructor-course-submit"),
    path("instructor/courses/<int:pk>/archive/", CourseArchiveView.as_view(), name="instructor-course-archive"),
    path("instructor/courses/<int:course_id>/sections/", SectionListCreateView.as_view(), name="instructor-section-list"),
    path("instructor/sections/<int:pk>/", SectionDetailView.as_view(), name="instructor-section-detail"),
    path("instructor/sections/<int:section_id>/lessons/", LessonListCreateView.as_view(), name="instructor-lesson-list"),
    path("instructor/lessons/<int:pk>/", LessonDetailView.as_view(), name="instructor-lesson-detail"),
]
