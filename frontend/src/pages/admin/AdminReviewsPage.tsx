import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Flag, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { RatingStars } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAdminReviews, useDeleteReview, useModerateReview, type AdminReviewFilters } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { formatDate, truncate } from "@/lib/utils";
import type { Review } from "@/types";

const PAGE_SIZE = 12;

export function AdminReviewsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const reported = params.get("reported") === "true";
  const search = params.get("search") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const filters: AdminReviewFilters = useMemo(
    () => ({ status: status || undefined, reported: reported || undefined, search: search || undefined, page }),
    [status, reported, search, page],
  );
  const reviews = useAdminReviews(filters);
  const results = reviews.data?.results ?? [];

  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const update = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  const activeTab = reported ? "reported" : status;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Reviews"
        description="Keep the catalogue trustworthy — hide abuse and clear false reports."
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {[
          { value: "", label: "All" },
          { value: "visible", label: "Visible" },
          { value: "hidden", label: "Hidden" },
          { value: "reported", label: "Reported" },
        ].map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete("status");
                next.delete("reported");
                if (tab.value === "reported") next.set("reported", "true");
                else if (tab.value) next.set("status", tab.value);
                next.delete("page");
                setParams(next, { replace: true });
              }}
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
            placeholder="Search course, student or text…"
            aria-label="Search reviews"
            className="pl-10"
          />
        </div>
      </div>

      {reviews.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : reviews.isError ? (
        <ErrorState message="We could not load reviews." onRetry={() => reviews.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState icon={Star} title="No reviews found" description="Nothing matches these filters." />
      ) : (
        <>
          <ul className="space-y-4">
            {results.map((review) => (
              <li key={review.id}>
                <ReviewRow review={review} onDelete={() => setDeleteTarget(review)} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={reviews.data?.count ?? 0}
            onPageChange={(p) => update("page", String(p), false)}
          />
        </>
      )}

      <DeleteReviewDialog review={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}

function ReviewRow({ review, onDelete }: { review: Review; onDelete: () => void }) {
  const moderate = useModerateReview();

  const setStatus = (moderation_status: "visible" | "hidden", clear_report = false) =>
    moderate.mutate(
      { id: review.id, moderation_status, clear_report },
      {
        onSuccess: () => toast.success(moderation_status === "hidden" ? "Review hidden." : "Review restored."),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "Action failed."),
      },
    );

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar src={review.student.avatar} name={review.student.full_name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{review.student.full_name}</span>
            <RatingStars value={review.rating} size={14} />
            <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{review.course_title}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {review.moderation_status === "hidden" && <Badge variant="danger">Hidden</Badge>}
          {review.is_reported && (
            <Badge variant="warning">
              <Flag className="h-3 w-3" aria-hidden />
              Reported
            </Badge>
          )}
          {review.is_verified_enrollment && <Badge variant="success">Verified</Badge>}
          {review.is_demo && <Badge variant="secondary">Demo</Badge>}
        </div>
      </div>

      {review.title && <p className="mt-3 font-medium text-foreground">{review.title}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{truncate(review.body, 320)}</p>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        {review.is_reported && (
          <Button
            variant="outline"
            size="sm"
            loading={moderate.isPending}
            onClick={() => setStatus(review.moderation_status, true)}
          >
            <Flag />
            Clear report
          </Button>
        )}
        {review.moderation_status === "visible" ? (
          <Button variant="outline" size="sm" loading={moderate.isPending} onClick={() => setStatus("hidden")}>
            <EyeOff />
            Hide
          </Button>
        ) : (
          <Button variant="outline" size="sm" loading={moderate.isPending} onClick={() => setStatus("visible")}>
            <Eye />
            Restore
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={onDelete}>
          <Trash2 />
          Delete
        </Button>
      </div>
    </Card>
  );
}

function DeleteReviewDialog({ review, onClose }: { review: Review | null; onClose: () => void }) {
  const remove = useDeleteReview();

  return (
    <ConfirmDialog
      open={Boolean(review)}
      title="Delete review"
      message="This review will be permanently deleted and the course rating recalculated."
      confirmLabel="Delete"
      destructive
      loading={remove.isPending}
      onConfirm={() => {
        if (!review) return;
        remove.mutate(review.id, {
          onSuccess: () => {
            toast.success("Review deleted.");
            onClose();
          },
          onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not delete."),
        });
      }}
      onCancel={onClose}
    />
  );
}
