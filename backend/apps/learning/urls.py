from django.urls import path

from apps.learning.views import (
    BookmarkDeleteView,
    BookmarkListCreateView,
    CoursePlayerView,
    CourseProgressView,
    LessonCompleteView,
    MyEnrollmentListView,
)

urlpatterns = [
    path("my/enrollments/", MyEnrollmentListView.as_view(), name="my-enrollments"),
    path("my/courses/<int:course_id>/progress/", CourseProgressView.as_view(), name="course-progress"),
    path("my/courses/<int:course_id>/player/", CoursePlayerView.as_view(), name="course-player"),
    path("my/lessons/<int:lesson_id>/complete/", LessonCompleteView.as_view(), name="lesson-complete"),
    path("my/bookmarks/", BookmarkListCreateView.as_view(), name="bookmark-list"),
    path("my/bookmarks/<int:course_id>/", BookmarkDeleteView.as_view(), name="bookmark-delete"),
]
