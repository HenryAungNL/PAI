import { Link } from "react-router-dom";
import { BookOpen, DollarSign, RotateCcw, Users } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { TrendChart } from "@/components/common/TrendChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
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

export function InstructorAnalyticsPage() {
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
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (stats.isError || !stats.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message="We could not load your analytics." onRetry={() => stats.refetch()} />
      </div>
    );
  }

  const { totals, courses, enrollment_trend, revenue_trend } = stats.data;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Analytics" description="Track how your teaching is performing over time." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net revenue"
          value={formatPrice(totals.net_revenue.amount_cents, totals.net_revenue.currency)}
          icon={DollarSign}
          tone="success"
          hint={`${formatPrice(totals.gross_revenue.amount_cents, totals.gross_revenue.currency)} gross`}
        />
        <StatCard
          label="Students"
          value={totals.students}
          icon={Users}
          hint={`${totals.enrollments} enrollments`}
        />
        <StatCard
          label="Completions"
          value={totals.completions}
          icon={BookOpen}
          tone="primary"
          hint={`${totals.published} published courses`}
        />
        <StatCard
          label="Refunded"
          value={formatPrice(totals.refunded.amount_cents, totals.refunded.currency)}
          icon={RotateCcw}
          tone="danger"
          hint={`Avg rating ${formatRating(totals.average_rating)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrollments (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollment_trend.some((t) => t.count > 0) ? (
              <TrendChart
                data={enrollment_trend.map((p) => ({ date: p.date, value: p.count }))}
                label="Enrollments over the last 30 days"
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No enrollments in this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue_trend.some((t) => t.amount_cents > 0) ? (
              <TrendChart
                data={revenue_trend.map((p) => ({ date: p.date, value: p.amount_cents }))}
                formatValue={(cents) => formatPrice(cents, "usd")}
                label="Revenue over the last 30 days"
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No revenue in this period.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Course performance</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses to analyse yet"
              description="Once you publish a course, its performance will appear here."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Course</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Enrollments</TH>
                  <TH className="text-right">Completions</TH>
                  <TH className="text-right">Rating</TH>
                  <TH className="text-right">Gross</TH>
                  <TH className="text-right">Net</TH>
                </TR>
              </THead>
              <TBody>
                {courses.map((course) => (
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
                    <TD className="text-right">{course.completed_count}</TD>
                    <TD className="text-right">
                      {course.review_count > 0 ? formatRating(course.average_rating) : "—"}
                    </TD>
                    <TD className="text-right">
                      {formatPrice(course.gross_revenue.amount_cents, course.gross_revenue.currency)}
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
    </div>
  );
}
