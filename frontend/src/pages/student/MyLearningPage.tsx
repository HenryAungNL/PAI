import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SmartImage } from "@/components/ui/smart-image";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useMyEnrollments } from "@/hooks/useApi";
import { formatDate, formatDuration } from "@/lib/utils";

type StatusFilter = "in_progress" | "completed";

export function MyLearningPage() {
  const [status, setStatus] = useState<StatusFilter>("in_progress");
  const enrollments = useMyEnrollments(status);
  const all = useMyEnrollments();
  const list = enrollments.data ?? [];

  const inProgressCount = (all.data ?? []).filter((e) => !e.is_completed).length;
  const completedCount = (all.data ?? []).filter((e) => e.is_completed).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My learning"
        description="Everything you're taking and everything you've finished."
      />

      <Tabs
        value={status}
        onChange={(v) => setStatus(v as StatusFilter)}
        tabs={[
          { value: "in_progress", label: "In progress", count: inProgressCount },
          { value: "completed", label: "Completed", count: completedCount },
        ]}
        className="mb-6"
      />

      {enrollments.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : enrollments.isError ? (
        <ErrorState message="We could not load your courses." onRetry={() => enrollments.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={status === "completed" ? CheckCircle2 : BookOpen}
          title={status === "completed" ? "No completed courses yet" : "You're not enrolled in anything yet"}
          description={
            status === "completed"
              ? "Finish all lessons in a course to see it here — and unlock your certificate."
              : "Browse the catalogue and enrol in your first course."
          }
          action={
            <Link to="/courses">
              <Button>Browse courses</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {list.map((enrollment) => (
            <li key={enrollment.id}>
              <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link to={`/dashboard/course/${enrollment.course.id}`} className="w-full shrink-0 sm:w-40">
                  <SmartImage
                    src={enrollment.course.thumbnail_url}
                    alt={enrollment.course.title}
                    ratioClassName="aspect-[16/9]"
                    className="rounded-lg"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/dashboard/course/${enrollment.course.id}`}
                    className="line-clamp-2 font-semibold text-foreground hover:text-primary"
                  >
                    {enrollment.course.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {enrollment.course.instructor.full_name} · {enrollment.course.lesson_count} lessons ·{" "}
                    {formatDuration(enrollment.course.total_duration_minutes)}
                  </p>

                  {enrollment.is_completed ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-success">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Completed {formatDate(enrollment.completed_at)}
                    </p>
                  ) : (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      Last accessed {formatDate(enrollment.last_accessed_at ?? enrollment.enrolled_at)}
                    </p>
                  )}
                </div>
                <div className="sm:w-48 sm:shrink-0">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{enrollment.progress_percent}%</span>
                  </div>
                  <Progress value={enrollment.progress_percent} label={`${enrollment.progress_percent}% complete`} />
                  <Link to={`/dashboard/course/${enrollment.course.id}`}>
                    <Button size="sm" variant={enrollment.is_completed ? "outline" : "default"} className="mt-3 w-full">
                      {enrollment.is_completed ? "Review" : "Continue"}
                    </Button>
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
