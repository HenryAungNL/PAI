import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Eye, MoreVertical, Pencil, Plus, Send, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { SmartImage } from "@/components/ui/smart-image";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import {
  useArchiveCourse,
  useDeleteCourse,
  useInstructorCourses,
  useSubmitCourse,
  type InstructorCourseFilters,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { courseStatusLabels, formatPrice, formatRating } from "@/lib/utils";
import type { CourseListItem, CourseStatus } from "@/types";

const PAGE_SIZE = 12;

const statusVariant: Record<CourseStatus, "success" | "warning" | "danger" | "secondary" | "default"> = {
  published: "success",
  pending: "warning",
  rejected: "danger",
  draft: "secondary",
  archived: "secondary",
};

export function InstructorCoursesPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filters: InstructorCourseFilters = useMemo(
    () => ({ status: status || undefined, search: search || undefined, page }),
    [status, search, page],
  );
  const courses = useInstructorCourses(filters);

  const [pendingDelete, setPendingDelete] = useState<CourseListItem | null>(null);

  const results = courses.data?.results ?? [];
  const total = courses.data?.count ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="My courses"
        description="Create, edit and publish the courses you teach."
        actions={
          <Link to="/instructor/courses/new">
            <Button>
              <Plus />
              New course
            </Button>
          </Link>
        }
      />

      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        className="mb-5"
        tabs={[
          { value: "", label: "All" },
          { value: "published", label: "Published" },
          { value: "pending", label: "Pending" },
          { value: "draft", label: "Drafts" },
          { value: "rejected", label: "Rejected" },
          { value: "archived", label: "Archived" },
        ]}
      />

      <div className="mb-5 max-w-sm">
        <Input
          type="search"
          placeholder="Search your courses…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search your courses"
        />
      </div>

      {courses.isLoading ? (
        <Card className="p-5">
          <TableSkeleton rows={6} cols={5} />
        </Card>
      ) : courses.isError ? (
        <ErrorState message="We could not load your courses." onRetry={() => courses.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Video}
          title={search || status ? "No courses match your filters" : "You haven't created a course yet"}
          description={
            search || status
              ? "Try a different search term or status filter."
              : "Turn your expertise into a course and start teaching on PAI."
          }
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
        <>
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>Course</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">Students</TH>
                  <TH className="text-right">Rating</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {results.map((course) => (
                  <TR key={course.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Link to={`/instructor/courses/${course.id}/edit`} className="w-16 shrink-0">
                          <SmartImage
                            src={course.thumbnail_url}
                            alt={course.title}
                            ratioClassName="aspect-[16/9]"
                            className="rounded-md"
                          />
                        </Link>
                        <div className="min-w-0">
                          <Link
                            to={`/instructor/courses/${course.id}/edit`}
                            className="line-clamp-1 font-medium text-foreground hover:text-primary"
                          >
                            {course.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {course.lesson_count} lessons · {course.enrollment_count} enrolled
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={statusVariant[course.status]}>
                        {courseStatusLabels[course.status] ?? course.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">{formatPrice(course.price_cents, course.currency)}</TD>
                    <TD className="text-right">{course.enrollment_count}</TD>
                    <TD className="text-right">
                      {course.review_count > 0 ? formatRating(course.average_rating) : "—"}
                    </TD>
                    <TD>
                      <CourseActions course={course} onDelete={() => setPendingDelete(course)} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDeleteCourse course={pendingDelete} onClose={() => setPendingDelete(null)} />
    </div>
  );
}

function CourseActions({ course, onDelete }: { course: CourseListItem; onDelete: () => void }) {
  const submit = useSubmitCourse();
  const archive = useArchiveCourse();
  const [menuOpen, setMenuOpen] = useState(false);

  const canSubmit = course.status === "draft" || course.status === "rejected";

  const onSubmit = () =>
    submit.mutate(course.id, {
      onSuccess: () => toast.success("Course submitted for review."),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not submit course."),
    });

  const onArchive = () =>
    archive.mutate(course.id, {
      onSuccess: () => toast.success("Course archived."),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not archive course."),
    });

  return (
    <div className="flex items-center justify-end gap-1">
      <Link to={`/instructor/courses/${course.id}/edit`}>
        <Button variant="ghost" size="sm" aria-label={`Edit ${course.title}`}>
          <Pencil />
          Edit
        </Button>
      </Link>
      {course.status === "published" && (
        <Link to={`/courses/${course.slug}`} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="sm" aria-label={`View ${course.title}`}>
            <Eye />
          </Button>
        </Link>
      )}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreVertical />
        </Button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
            >
              {canSubmit && (
                <MenuItem
                  icon={Send}
                  label="Submit for review"
                  onClick={() => {
                    setMenuOpen(false);
                    onSubmit();
                  }}
                />
              )}
              {course.status !== "archived" && (
                <MenuItem
                  icon={Archive}
                  label="Archive"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive();
                  }}
                />
              )}
              <MenuItem
                icon={Trash2}
                label="Delete"
                destructive
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
        destructive ? "text-danger hover:bg-red-50" : "text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function ConfirmDeleteCourse({ course, onClose }: { course: CourseListItem | null; onClose: () => void }) {
  const remove = useDeleteCourse();

  const onConfirm = () => {
    if (!course) return;
    remove.mutate(course.id, {
      onSuccess: () => {
        toast.success("Course deleted.");
        onClose();
      },
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "Could not delete this course."),
    });
  };

  return (
    <ConfirmDialog
      open={Boolean(course)}
      title="Delete course"
      message={
        course
          ? `"${course.title}" will be permanently removed. Courses with enrolled students can't be deleted — archive them instead.`
          : ""
      }
      confirmLabel="Delete"
      destructive
      loading={remove.isPending}
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
