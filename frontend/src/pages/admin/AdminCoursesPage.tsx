import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Archive, CheckCircle2, Eye, RotateCcw, Search, Sparkles, Star, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { SmartImage } from "@/components/ui/smart-image";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAdminCourses, useFeatureCourse, useModerateCourse, type AdminCourseFilters } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { courseStatusLabels, formatDate, formatPrice } from "@/lib/utils";
import type { CourseListItem, CourseStatus } from "@/types";

const PAGE_SIZE = 12;

const statusVariant: Record<CourseStatus, "success" | "warning" | "danger" | "secondary" | "default"> = {
  published: "success",
  pending: "warning",
  rejected: "danger",
  draft: "secondary",
  archived: "secondary",
};

const tabOptions = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

export function AdminCoursesPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const search = params.get("search") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const filters: AdminCourseFilters = useMemo(
    () => ({ status: status || undefined, search: search || undefined, page }),
    [status, search, page],
  );
  const courses = useAdminCourses(filters);
  const results = courses.data?.results ?? [];

  const [review, setReview] = useState<CourseListItem | null>(null);
  const [reject, setReject] = useState<{ course: CourseListItem; note: string } | null>(null);

  const update = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Course moderation"
        description="Review, publish and feature the courses instructors submit."
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {tabOptions.map((tab) => {
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
            placeholder="Search by title or instructor…"
            aria-label="Search courses"
            className="pl-10"
          />
        </div>
      </div>

      {courses.isLoading ? (
        <Card className="p-5">
          <TableSkeleton rows={6} cols={5} />
        </Card>
      ) : courses.isError ? (
        <ErrorState message="We could not load courses." onRetry={() => courses.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nothing to moderate" description="No courses match these filters." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>Course</TH>
                  <TH>Instructor</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">Students</TH>
                  <TH>Updated</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {results.map((course) => (
                  <TR key={course.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="w-16 shrink-0">
                          <SmartImage
                            src={course.thumbnail_url}
                            alt={course.title}
                            ratioClassName="aspect-[16/9]"
                            className="rounded-md"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium text-foreground">{course.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {course.category?.name ?? "Uncategorised"} · {course.lesson_count} lessons
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-sm">
                      <Link to={`/instructors/${course.instructor.id}`} className="hover:text-primary">
                        {course.instructor.full_name}
                      </Link>
                    </TD>
                    <TD>
                      <Badge variant={statusVariant[course.status]}>
                        {courseStatusLabels[course.status] ?? course.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">{formatPrice(course.price_cents, course.currency)}</TD>
                    <TD className="text-right">{course.enrollment_count}</TD>
                    <TD className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(course.published_at ?? course.created_at)}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setReview(course)}>
                          <Eye />
                          Review
                        </Button>
                        {course.status === "pending" && (
                          <>
                            <ApproveButton course={course} />
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Reject"
                              className="text-danger hover:bg-red-50"
                              onClick={() => setReject({ course, note: "" })}
                            >
                              <XCircle />
                            </Button>
                          </>
                        )}
                        {(course.status === "rejected" || course.status === "archived") && <RestoreButton course={course} />}
                        {course.status === "published" && <ArchiveButton course={course} />}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={courses.data?.count ?? 0}
            onPageChange={(p) => update("page", String(p), false)}
          />
        </>
      )}

      <ReviewCourseModal course={review} onClose={() => setReview(null)} />

      <Modal
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        title="Reject course"
        description={reject ? `Explain what needs changing in "${reject.course.title}".` : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setReject(null)}>
              Cancel
            </Button>
            <RejectConfirm reject={reject} onDone={() => setReject(null)} />
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="reject-note">Feedback for the instructor</Label>
          <Textarea
            id="reject-note"
            rows={4}
            value={reject?.note ?? ""}
            onChange={(e) => reject && setReject({ ...reject, note: e.target.value })}
            placeholder="e.g. Please add a section with at least three lessons and clarify the learning objectives."
          />
        </div>
      </Modal>
    </div>
  );
}

function useModerate(action: "approve" | "reject" | "archive" | "restore") {
  const moderate = useModerateCourse();
  return (course: CourseListItem, note?: string, onSuccess?: () => void) =>
    moderate.mutate(
      { id: course.id, action, note },
      {
        onSuccess: () => {
          toast.success(
            {
              approve: "Course approved and published.",
              reject: "Course rejected — the instructor has been notified.",
              archive: "Course archived.",
              restore: "Course restored to draft.",
            }[action],
          );
          onSuccess?.();
        },
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "Action failed."),
      },
    );
}

function ApproveButton({ course }: { course: CourseListItem }) {
  const run = useModerate("approve");
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Approve"
      className="text-success hover:bg-green-50"
      onClick={() => run(course)}
    >
      <CheckCircle2 />
    </Button>
  );
}

function ArchiveButton({ course }: { course: CourseListItem }) {
  const run = useModerate("archive");
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Archive"
      className="text-muted-foreground hover:bg-muted"
      onClick={() => run(course)}
    >
      <Archive />
    </Button>
  );
}

function RestoreButton({ course }: { course: CourseListItem }) {
  const run = useModerate("restore");
  return (
    <Button variant="ghost" size="sm" onClick={() => run(course)}>
      <RotateCcw />
      Restore
    </Button>
  );
}

function RejectConfirm({
  reject,
  onDone,
}: {
  reject: { course: CourseListItem; note: string } | null;
  onDone: () => void;
}) {
  const moderate = useModerateCourse();
  if (!reject) return null;
  return (
    <Button
      variant="danger"
      loading={moderate.isPending}
      onClick={() =>
        moderate.mutate(
          { id: reject.course.id, action: "reject", note: reject.note },
          {
            onSuccess: () => {
              toast.success("Course rejected — the instructor has been notified.");
              onDone();
            },
            onError: (error) => toast.error(error instanceof ApiError ? error.message : "Action failed."),
          },
        )
      }
    >
      Reject course
    </Button>
  );
}

function ReviewCourseModal({ course, onClose }: { course: CourseListItem | null; onClose: () => void }) {
  const feature = useFeatureCourse();
  if (!course) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={course.title}
      description={`${course.instructor.full_name} · ${courseStatusLabels[course.status] ?? course.status}`}
      footer={
        <>
          <Button
            variant="outline"
            loading={feature.isPending}
            onClick={() =>
              feature.mutate(
                { id: course.id, featured: true },
                {
                  onSuccess: () => toast.success("Course featured on the homepage."),
                  onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not feature."),
                },
              )
            }
          >
            <Star />
            Feature
          </Button>
          <Link to={`/courses/${course.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Eye />
              View public page
            </Button>
          </Link>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <SmartImage
        src={course.thumbnail_url}
        alt={course.title}
        ratioClassName="aspect-[16/9]"
        className="rounded-lg"
      />
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Stat label="Price" value={formatPrice(course.price_cents, course.currency)} />
        <Stat label="Lessons" value={String(course.lesson_count)} />
        <Stat label="Students" value={String(course.enrollment_count)} />
        <Stat label="Created" value={formatDate(course.created_at)} />
      </dl>
      <p className="text-sm text-muted-foreground">{course.subtitle || "No subtitle provided."}</p>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
    </div>
  );
}
