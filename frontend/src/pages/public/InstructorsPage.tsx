import { Link } from "react-router-dom";
import { BookOpen, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useInstructors } from "@/hooks/useApi";
import { truncate } from "@/lib/utils";

export function InstructorsPage() {
  const instructors = useInstructors();

  return (
    <div className="container py-10 lg:py-14">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Our instructors</h1>
        <p className="mt-2 text-muted-foreground">
          Learn from vetted professionals who teach the skills they use every day.
        </p>
      </header>

      {instructors.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : instructors.isError ? (
        <ErrorState message="We could not load instructors." onRetry={() => instructors.refetch()} />
      ) : (instructors.data ?? []).length === 0 ? (
        <EmptyState title="No instructors yet" description="Instructors appear here once they publish a course." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(instructors.data ?? []).map((instructor) => (
            <Card key={instructor.id} className="flex h-full flex-col items-center p-6 text-center">
              <Avatar src={instructor.avatar} name={instructor.full_name} size="xl" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                <Link to={`/instructors/${instructor.id}`} className="hover:text-primary">
                  {instructor.full_name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-primary">{instructor.headline}</p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{truncate(instructor.bio, 140)}</p>
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  {instructor.course_count} courses
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" aria-hidden />
                  {instructor.student_count} learners
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
