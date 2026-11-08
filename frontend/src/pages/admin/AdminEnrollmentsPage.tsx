import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GraduationCap, Search } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAdminEnrollments, type AdminEnrollmentFilters } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 12;

const statusTabs = [
  { value: "", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export function AdminEnrollmentsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const search = params.get("search") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const filters: AdminEnrollmentFilters = useMemo(
    () => ({ status: status || undefined, search: search || undefined, page }),
    [status, search, page],
  );
  const enrollments = useAdminEnrollments(filters);
  const results = enrollments.data?.results ?? [];

  const update = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Enrollments" description="Every learner's progress across the catalogue." />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {statusTabs.map((tab) => {
          const active = tab.value === status;
          return (
            <button
              key={tab.value}
              onClick={() => update("status", tab.value)}
              className={
                "relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search by student or course…"
            aria-label="Search enrollments"
            className="pl-10"
          />
        </div>
      </div>

      {enrollments.isLoading ? (
        <Card className="p-5">
          <TableSkeleton rows={6} cols={5} />
        </Card>
      ) : enrollments.isError ? (
        <ErrorState message="We could not load enrollments." onRetry={() => enrollments.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No enrollments found" description="Nothing matches these filters." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>Student</TH>
                  <TH>Course</TH>
                  <TH>Progress</TH>
                  <TH>Status</TH>
                  <TH>Enrolled</TH>
                </TR>
              </THead>
              <TBody>
                {results.map((enrollment) => (
                  <TR key={enrollment.id}>
                    <TD>
                      {enrollment.student ? (
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{enrollment.student.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{enrollment.student.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>
                      <Link
                        to={`/courses/${enrollment.course.slug}`}
                        className="line-clamp-1 font-medium text-foreground hover:text-primary"
                      >
                        {enrollment.course.title}
                      </Link>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={enrollment.progress_percent}
                          label={`${enrollment.progress_percent}% complete`}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">{enrollment.progress_percent}%</span>
                      </div>
                    </TD>
                    <TD>
                      {enrollment.is_completed ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <Badge variant="warning">In progress</Badge>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(enrollment.enrolled_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={enrollments.data?.count ?? 0}
            onPageChange={(p) => update("page", String(p), false)}
          />
        </>
      )}
    </div>
  );
}
