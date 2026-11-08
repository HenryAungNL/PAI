import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Users } from "lucide-react";

import { CourseCard } from "@/components/courses/CourseCard";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { useInstructor } from "@/hooks/useApi";

export function InstructorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const instructorId = id ? Number(id) : undefined;
  const instructor = useInstructor(instructorId);

  if (instructor.isLoading) {
    return (
      <div className="container py-14">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (instructor.isError || !instructor.data) {
    return (
      <div className="container py-20">
        <EmptyState
          icon={Users}
          title="Instructor not found"
          description="This instructor may no longer be active."
          action={
            <Button onClick={() => window.history.back()}>
              Go back
            </Button>
          }
        />
      </div>
    );
  }

  const data = instructor.data;

  return (
    <div className="container py-10 lg:py-14">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => window.history.back()}>
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-surface p-8 sm:flex-row sm:items-center">
        <Avatar src={data.avatar} name={data.full_name} size="xl" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{data.full_name}</h1>
          <p className="text-primary">{data.headline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" aria-hidden />
              {data.course_count ?? 0} courses
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              {data.student_count ?? 0} learners
            </span>
          </div>
        </div>
      </div>

      {data.bio && <p className="mt-6 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">{data.bio}</p>}

      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Courses by {data.full_name}</h2>
        {(data.courses ?? []).length === 0 ? (
          <EmptyState icon={BookOpen} title="No published courses yet" />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data.courses ?? []).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        Looking for a different topic?{" "}
        <Link to="/courses" className="font-medium text-primary hover:underline">
          Browse all courses
        </Link>
        .
      </p>
    </div>
  );
}
