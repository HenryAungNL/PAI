import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { TrendChart } from "@/components/common/TrendChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAuth } from "@/features/auth/AuthContext";
import { useInstructorStats } from "@/hooks/useApi";
import { courseStatusLabels, formatPrice, formatRating } from "@/lib/utils";
import type { CourseStatus } from "@/types";

const statusVariant: Record<CourseStatus, "success" | "warning" | "danger" | "secondary" | "default"> = {
  published: "success",
  pending: "warning",
  rejected: "danger",
  draft: "secondary",
  archived: "secondary",
};

export function InstructorDashboardPage() {
  const { user } = useAuth();
  const stats = useInstructorStats();

  if (stats.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (stats.isError || !stats.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message="We could not load your teaching dashboard." onRetry={() => stats.refetch()} />
      </div>
    );
  }

  const { totals, courses, enrollment_trend } = stats.data;
  const trend = enrollment_trend.map((point) => ({ date: point.date, value: point.count }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome, ${user?.first_name || "instructor"}`}
        description="A snapshot of how your courses are performing."
        actions={
          <Link to="/instructor/courses/new">
            <Button>
              <Plus />
              New course
            </Button>
          </Link>
        }
      />

      {!user?.is_approved && (
        <Card className="mb-6 flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50/70 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm text-amber-800">
            Your instructor profile is awaiting administrator approval. You can build and submit courses in the
            meantime — they'll be listed publicly once approved.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students reached"
          value={totals.students}
          icon={Users}
          hint={`${totals.enrollments} total enrollments`}
        />
        <StatCard
          label="Published courses"
          value={totals.published}
          icon={BookOpen}
          tone="primary"
          hint={`${totals.drafts} draft · ${totals.pending} pending`}
        />
        <StatCard
          label="Average rating"
          value={formatRating(totals.average_rating)}
          icon={Star}
          tone="success"
          hint={`${totals.completions} completions`}
        />
        <StatCard
          label="Net revenue"
          value={formatPrice(totals.net_revenue.amount_cents, totals.net_revenue.currency)}
          icon={DollarSign}
          tone="success"
          hint={`${formatPrice(totals.refunded.amount_cents, totals.refunded.currency)} refunded`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Your courses</CardTitle>
            <Link to="/instructor/courses" className="text-sm font-medium text-primary hover:underline">
              Manage all
            </Link>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Create your first course to start reaching students."
                action={
                  <Link to="/instructor/courses/new">
                    <Button>
                      <Plus />
                      New course
                    </Button>
                  </Link>
                }
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Course</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Students</TH>
                    <TH className="text-right">Rating</TH>
                    <TH className="text-right">Net</TH>
                  </TR>
                </THead>
                <TBody>
                  {courses.slice(0, 6).map((course) => (
                    <TR key={course.id}>
                      <TD>
                        <Link
                          to={`/instructor/courses/${course.id}/edit`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {course.title}
                        </Link>
                      </TD>
                      <TD>
                        <Badge variant={statusVariant[course.status]}>
                          {courseStatusLabels[course.status] ?? course.status}
                        </Badge>
                      </TD>
                      <TD className="text-right">{course.enrollment_count}</TD>
                      <TD className="text-right">
                        {course.review_count > 0 ? formatRating(course.average_rating) : "—"}
                      </TD>
                      <TD className="text-right font-medium">
                        {formatPrice(course.net_revenue.amount_cents, course.net_revenue.currency)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                New enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trend.some((t) => t.value > 0) ? (
                <TrendChart data={trend} label="New enrollments over the last 30 days" />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No enrollment activity in the last 30 days yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={CheckCircle2} label="Completions" value={String(totals.completions)} />
              <Row icon={Clock} label="Pending review" value={String(totals.pending)} />
              <Row
                icon={DollarSign}
                label="Gross revenue"
                value={formatPrice(totals.gross_revenue.amount_cents, totals.gross_revenue.currency)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
