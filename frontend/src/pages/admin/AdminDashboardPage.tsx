import { Link } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  DollarSign,
  GraduationCap,
  Layers,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { TrendChart } from "@/components/common/TrendChart";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useAdminStats } from "@/hooks/useApi";
import { formatDate, formatPrice, formatRating } from "@/lib/utils";

export function AdminDashboardPage() {
  const stats = useAdminStats();

  if (stats.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-10 w-72" />
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
        <ErrorState message="We could not load platform metrics." onRetry={() => stats.refetch()} />
      </div>
    );
  }

  const data = stats.data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Platform overview"
        description="Live metrics across users, courses, enrollments and revenue."
      />

      {(data.courses.pending > 0 || data.reviews.reported > 0) && (
        <Card className="mb-6 flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50/70 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm text-amber-800">
            {data.courses.pending > 0 && `${data.courses.pending} course(s) awaiting review. `}
            {data.reviews.reported > 0 && `${data.reviews.reported} reported review(s) need attention.`}
          </p>
          <div className="ml-auto flex gap-2">
            {data.courses.pending > 0 && (
              <Link to="/admin/courses?status=pending">
                <Button size="sm" variant="outline">
                  Review courses
                </Button>
              </Link>
            )}
            {data.reviews.reported > 0 && (
              <Link to="/admin/reviews?reported=true">
                <Button size="sm" variant="outline">
                  Moderate reviews
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={data.users.total}
          icon={Users}
          hint={`${data.users.new_last_30_days} new in 30 days`}
        />
        <StatCard
          label="Published courses"
          value={data.courses.published}
          icon={BookOpen}
          tone="primary"
          hint={`${data.courses.pending} pending review`}
        />
        <StatCard
          label="Enrollments"
          value={data.enrollments.total}
          icon={GraduationCap}
          hint={`${data.enrollments.last_30_days} in 30 days`}
        />
        <StatCard
          label="Net revenue"
          value={formatPrice(data.revenue.net.amount_cents, data.revenue.net.currency)}
          icon={DollarSign}
          tone="success"
          hint={`${formatPrice(data.revenue.refunded.amount_cents, data.revenue.refunded.currency)} refunded`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
              Enrollment trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.enrollment_trend.some((t) => t.count > 0) ? (
              <TrendChart
                data={data.enrollment_trend.map((p) => ({ date: p.date, value: p.count }))}
                label="Enrollments over the last 30 days"
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No enrollments in the last 30 days.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" aria-hidden />
              Revenue trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenue_trend.some((t) => t.amount_cents > 0) ? (
              <TrendChart
                data={data.revenue_trend.map((p) => ({ date: p.date, value: p.amount_cents }))}
                formatValue={(cents) => formatPrice(cents, data.revenue.net.currency)}
                label="Revenue over the last 30 days"
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No revenue in the last 30 days.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Students" value={data.users.students} />
            <Row label="Instructors" value={data.users.instructors} />
            <Row label="Admins" value={data.users.admins} />
            <Row label="Suspended" value={data.users.suspended} />
            <Row label="Draft courses" value={data.courses.draft} />
            <Row label="Completions" value={data.enrollments.completed} />
            <Row
              label="Avg rating"
              value={formatRating(data.reviews.average_rating)}
              icon={<Star className="h-3.5 w-3.5 text-primary" aria-hidden />}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_registrations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No registrations yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recent_registrations.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar name={user.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {user.role}
                    </Badge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatDate(user.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent transactions</CardTitle>
          <Link to="/admin/orders" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {data.recent_transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet — revenue appears here after the first paid order.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent_transactions.map((tx) => (
                <li key={tx.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{tx.course_title}</p>
                    <p className="truncate text-xs text-muted-foreground">{tx.email}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {formatPrice(tx.amount_cents, tx.currency)}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {formatDate(tx.paid_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2.5 last:border-0 last:pb-0">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon ?? <Layers className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
