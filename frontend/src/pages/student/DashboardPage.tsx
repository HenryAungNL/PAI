import { Link } from "react-router-dom";
import { Award, BookOpen, CheckCircle2, Clock, PlayCircle, TrendingUp } from "lucide-react";

import { CourseCard } from "@/components/courses/CourseCard";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SmartImage } from "@/components/ui/smart-image";
import { CourseGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/AuthContext";
import { useMyCertificates, useMyEnrollments, usePopularCourses } from "@/hooks/useApi";
import { formatDuration } from "@/lib/utils";

export function DashboardPage() {
  const { user } = useAuth();
  const enrollments = useMyEnrollments();
  const certificates = useMyCertificates();
  const recommended = usePopularCourses();

  const list = enrollments.data ?? [];
  const inProgress = list.filter((e) => !e.is_completed);
  const completed = list.filter((e) => e.is_completed);
  const continueLearning = [...inProgress].sort(
    (a, b) => new Date(b.last_accessed_at ?? b.enrolled_at).getTime() - new Date(a.last_accessed_at ?? a.enrolled_at).getTime(),
  );
  const enrolledIds = new Set(list.map((e) => e.course.id));
  const recommendations = (recommended.data?.results ?? []).filter((c) => !enrolledIds.has(c.id)).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${user?.first_name || "learner"}`}
        description="Pick up where you left off or discover something new."
        actions={
          <Link to="/courses">
            <Button variant="outline">
              <BookOpen />
              Explore courses
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled courses" value={list.length} icon={BookOpen} />
        <StatCard label="In progress" value={inProgress.length} icon={Clock} tone="primary" />
        <StatCard label="Completed" value={completed.length} icon={CheckCircle2} tone="success" />
        <StatCard label="Certificates" value={certificates.data?.length ?? 0} icon={Award} tone="primary" />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Continue learning</h2>
          <Link to="/dashboard/learning" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        {enrollments.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : continueLearning.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No courses in progress"
            description="Enroll in a course to start tracking your progress here."
            action={
              <Link to="/courses">
                <Button>Browse courses</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {continueLearning.slice(0, 4).map((enrollment) => (
              <Card key={enrollment.id} className="flex gap-4 p-4">
                <Link to={`/dashboard/course/${enrollment.course.id}`} className="w-32 shrink-0">
                  <SmartImage
                    src={enrollment.course.thumbnail_url}
                    alt={enrollment.course.title}
                    ratioClassName="aspect-[4/3]"
                    className="rounded-lg"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/dashboard/course/${enrollment.course.id}`}
                    className="line-clamp-2 font-semibold text-foreground hover:text-primary"
                  >
                    {enrollment.course.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {enrollment.course.instructor.full_name} · {formatDuration(enrollment.course.total_duration_minutes)}
                  </p>
                  <div className="mt-auto pt-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{enrollment.progress_percent}% complete</span>
                    </div>
                    <Progress value={enrollment.progress_percent} label={`${enrollment.progress_percent}% complete`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-xl font-bold tracking-tight">Recommended for you</h2>
        </div>
        {recommended.isLoading ? (
          <CourseGridSkeleton count={3} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
