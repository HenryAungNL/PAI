import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { CourseCard } from "@/components/courses/CourseCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CourseGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useBookmarks, useRemoveBookmark } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";

export function BookmarksPage() {
  const bookmarks = useBookmarks();
  const remove = useRemoveBookmark();

  const list = bookmarks.data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Saved courses"
        description="Courses you've bookmarked to revisit later."
      />

      {bookmarks.isLoading ? (
        <CourseGridSkeleton count={3} />
      ) : bookmarks.isError ? (
        <ErrorState message="We could not load your saved courses." onRetry={() => bookmarks.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved courses yet"
          description="Tap the save button on any course to keep it handy here."
          action={
            <Link to="/courses">
              <Button>Browse courses</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((bookmark) => (
            <div key={bookmark.id} className="flex flex-col">
              <CourseCard course={bookmark.course} />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 self-start text-danger hover:bg-red-50"
                loading={remove.isPending}
                onClick={() =>
                  remove.mutate(bookmark.course.id, {
                    onSuccess: () => toast.success("Removed from saved courses."),
                    onError: (error) =>
                      toast.error(error instanceof ApiError ? error.message : "Could not remove."),
                  })
                }
              >
                <Heart className="fill-danger" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
