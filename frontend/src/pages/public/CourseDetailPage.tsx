import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Heart,
  Infinity as InfinityIcon,
  Lock,
  PlayCircle,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { CourseCard } from "@/components/courses/CourseCard";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { RatingInput, RatingStars } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Textarea, Input, Label, FieldError } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/AuthContext";
import {
  useAddBookmark,
  useBookmarks,
  useCheckout,
  useCourse,
  useCourseReviews,
  useCourses,
  useEnrollFree,
  useMyReview,
  useRemoveBookmark,
  useSubmitReview,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { cn, difficultyLabels, formatDate, formatDuration, formatPrice, plainText } from "@/lib/utils";
import type { CourseDetail, Section } from "@/types";

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { status } = useAuth();
  const course = useCourse(slug);
  const [tab, setTab] = useState("overview");

  const related = useCourses(
    course.data?.category ? { category: course.data.category.slug, page_size: 3 } : {},
  );

  if (course.isLoading) return <CourseDetailSkeleton />;
  if (course.isError || !course.data) {
    const notFound = course.error instanceof ApiError && course.error.status === 404;
    return (
      <div className="container py-20">
        <EmptyState
          icon={BookOpen}
          title={notFound ? "Course not found" : "We could not load this course"}
          description={
            notFound
              ? "This course may have been removed or is not published yet."
              : "Please try again in a moment."
          }
          action={
            <Button onClick={() => navigate("/courses")}>
              Browse courses
            </Button>
          }
        />
      </div>
    );
  }

  const data = course.data;
  const viewer = data.viewer;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
          <div>
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/courses" className="hover:text-primary">
                Courses
              </Link>
              {data.category && (
                <>
                  <span aria-hidden>/</span>
                  <Link to={`/courses?category=${data.category.slug}`} className="hover:text-primary">
                    {data.category.name}
                  </Link>
                </>
              )}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              {data.category && <Badge variant="solid">{data.category.name}</Badge>}
              <Badge variant="outline">{difficultyLabels[data.difficulty]}</Badge>
              {data.is_featured && <Badge variant="warning">Featured</Badge>}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{data.title}</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{data.subtitle}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <RatingStars value={Number(data.average_rating)} size={16} />
                <span className="font-semibold text-foreground">{Number(data.average_rating).toFixed(1)}</span>
                <span>({data.review_count} reviews)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" aria-hidden />
                {data.enrollment_count} students
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden />
                {formatDuration(data.total_duration_minutes)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-4 w-4" aria-hidden />
                Updated {formatDate(data.updated_at)}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Avatar src={data.instructor.avatar} name={data.instructor.full_name} size="md" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Created by{" "}
                  <Link to={`/instructors/${data.instructor.id}`} className="text-primary hover:underline">
                    {data.instructor.full_name}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">{data.instructor.headline}</p>
              </div>
            </div>
          </div>

          {/* Purchase card (desktop) */}
          <div className="hidden lg:block">
            <PurchaseCard course={data} authenticated={status === "authenticated"} />
          </div>
        </div>
      </section>

      <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
        <div className="min-w-0">
          {/* Purchase card (mobile) */}
          <div className="mb-8 lg:hidden">
            <PurchaseCard course={data} authenticated={status === "authenticated"} />
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "overview", label: "Overview" },
              { value: "curriculum", label: "Curriculum", count: data.lesson_count },
              { value: "instructor", label: "Instructor" },
              { value: "reviews", label: "Reviews", count: data.review_count },
            ]}
          />

          <div className="pt-8">
            {tab === "overview" && <OverviewTab course={data} />}
            {tab === "curriculum" && <CurriculumTab sections={data.sections} lessonCount={data.lesson_count} totalMinutes={data.total_duration_minutes} />}
            {tab === "instructor" && <InstructorTab course={data} />}
            {tab === "reviews" && (
              <CourseReviews
                courseId={data.id}
                isEnrolled={viewer.is_enrolled}
                authenticated={status === "authenticated"}
              />
            )}
          </div>
        </div>

        <div className="hidden lg:block" aria-hidden />
      </div>

      {/* Related */}
      {(related.data?.results ?? []).length > 0 && (
        <section className="border-t border-border bg-surface py-14">
          <div className="container">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">Students also viewed</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(related.data?.results ?? [])
                .filter((c) => c.id !== data.id)
                .slice(0, 3)
                .map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Purchase card                                                       */
/* ------------------------------------------------------------------ */
function PurchaseCard({
  course,
  authenticated,
}: {
  course: CourseDetail;
  authenticated: boolean;
}) {
  const navigate = useNavigate();
  const checkout = useCheckout();
  const enrollFree = useEnrollFree();
  const bookmarks = useBookmarks();
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();
  const [shared, setShared] = useState(false);

  const viewer = course.viewer;
  const hasAccess = viewer.is_owner || viewer.is_enrolled;
  const saved = (bookmarks.data ?? []).some((b) => b.course.id === course.id);

  const requireAuth = () => {
    if (!authenticated) {
      navigate("/login", { state: { from: `/courses/${course.slug}` } });
      return false;
    }
    return true;
  };

  const onEnroll = () => {
    if (!requireAuth()) return;
    checkout.mutate(course.id, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "We could not start checkout.");
      },
    });
  };

  const onEnrollFree = () => {
    if (!requireAuth()) return;
    enrollFree.mutate(course.id, {
      onSuccess: () => {
        toast.success("You are enrolled. Happy learning!");
        navigate(`/dashboard/course/${course.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "Enrollment failed.");
      },
    });
  };

  const onToggleBookmark = () => {
    if (!requireAuth()) return;
    if (saved) {
      removeBookmark.mutate(course.id, { onSuccess: () => toast.success("Removed from saved courses.") });
    } else {
      addBookmark.mutate(course.id, { onSuccess: () => toast.success("Saved to your courses.") });
    }
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      toast.success("Link copied to clipboard.");
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <Card className="overflow-hidden p-0 shadow-card-hover">
      <div className="aspect-video w-full overflow-hidden border-b border-border bg-neutral-100">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-primary-300">
            <BookOpen className="h-10 w-10" aria-hidden />
          </div>
        )}
      </div>
      <div className="space-y-5 p-6">
        <div className="flex items-baseline gap-3">
          <span className={cn("text-3xl font-bold", course.is_free ? "text-success" : "text-foreground")}>
            {formatPrice(course.price_cents, course.currency)}
          </span>
          {!course.is_free && <span className="text-sm text-muted-foreground">one-time payment</span>}
        </div>

        {hasAccess ? (
          <Button size="lg" className="w-full" onClick={() => navigate(`/dashboard/course/${course.id}`)}>
            <PlayCircle />
            {viewer.is_owner ? "Preview course" : "Continue learning"}
          </Button>
        ) : course.is_free ? (
          <Button size="lg" className="w-full" loading={enrollFree.isPending} onClick={onEnrollFree}>
            Enroll for free
          </Button>
        ) : (
          <>
            <Button size="lg" className="w-full" loading={checkout.isPending} onClick={onEnroll}>
              Enroll now
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secure checkout with Stripe. 30-day refund policy.
            </p>
          </>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onToggleBookmark} loading={addBookmark.isPending || removeBookmark.isPending}>
            <Heart className={cn(saved && "fill-primary text-primary")} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onShare}>
            {shared ? <CheckCircle2 /> : <Share2 />}
            Share
          </Button>
        </div>

        <div className="border-t border-border pt-5">
          <p className="mb-3 text-sm font-semibold text-foreground">This course includes</p>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <Feature icon={PlayCircle}>{course.lesson_count} lessons</Feature>
            <Feature icon={Clock}>{formatDuration(course.total_duration_minutes)} of content</Feature>
            <Feature icon={Globe}>Lifetime access on any device</Feature>
            <Feature icon={Award}>Certificate of completion</Feature>
            <Feature icon={InfinityIcon}>30-day refund guarantee</Feature>
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Feature({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      {children}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */
function OverviewTab({ course }: { course: CourseDetail }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-bold tracking-tight">About this course</h2>
        <div className="mt-3 space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">
          {course.description}
        </div>
      </section>

      {course.learning_objectives.length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">What you'll learn</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {course.learning_objectives.map((objective) => (
              <li key={objective} className="flex gap-2.5 text-sm text-neutral-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                {objective}
              </li>
            ))}
          </ul>
        </section>
      )}

      {course.requirements.length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">Requirements</h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-neutral-700">
            {course.requirements.map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CurriculumTab({
  sections,
  lessonCount,
  totalMinutes,
}: {
  sections: Section[];
  lessonCount: number;
  totalMinutes: number;
}) {
  const [open, setOpen] = useState<number[]>(sections.map((s) => s.id));

  const toggle = (id: number) => setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (sections.length === 0) {
    return <EmptyState icon={BookOpen} title="Curriculum coming soon" description="The instructor is still building this course." />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{sections.length} sections</span>
        <span aria-hidden>·</span>
        <span>{lessonCount} lessons</span>
        <span aria-hidden>·</span>
        <span>{formatDuration(totalMinutes)} total</span>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {sections.map((section) => {
          const isOpen = open.includes(section.id);
          const minutes = section.lessons.reduce((sum, l) => sum + l.duration_minutes, 0);
          return (
            <div key={section.id}>
              <button
                onClick={() => toggle(section.id)}
                className="flex w-full items-center justify-between gap-4 bg-surface/60 px-4 py-3.5 text-left hover:bg-surface"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden />
                  <span className="font-semibold text-foreground">{section.title}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {section.lessons.length} lessons · {formatDuration(minutes)}
                </span>
              </button>
              {isOpen && (
                <ul className="divide-y divide-border">
                  {section.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                      {"video_url" in lesson && lesson.video_url ? (
                        <PlayCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="flex-1 text-sm text-neutral-700">{lesson.title}</span>
                      {"is_preview" in lesson && lesson.is_preview && <Badge variant="success">Preview</Badge>}
                      <span className="text-xs text-muted-foreground">{formatDuration(lesson.duration_minutes)}</span>
                      {!("video_url" in lesson) && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InstructorTab({ course }: { course: CourseDetail }) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar src={course.instructor.avatar} name={course.instructor.full_name} size="xl" />
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            <Link to={`/instructors/${course.instructor.id}`} className="hover:text-primary">
              {course.instructor.full_name}
            </Link>
          </h2>
          <p className="text-sm text-primary">{course.instructor.headline}</p>
          <p className="mt-1 inline-flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {course.instructor.course_count ?? 0} courses
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" aria-hidden />
              {Number(course.average_rating).toFixed(1)} instructor rating
            </span>
          </p>
        </div>
      </div>
      <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">{course.instructor.bio}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */
function CourseReviews({
  courseId,
  isEnrolled,
  authenticated,
}: {
  courseId: number;
  isEnrolled: boolean;
  authenticated: boolean;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const reviews = useCourseReviews(courseId, page);
  const myReview = useMyReview(courseId, authenticated && isEnrolled);
  const submit = useSubmitReview(courseId);

  const total = reviews.data?.count ?? 0;
  const results = reviews.data?.results ?? [];
  const average = results.length ? results.reduce((s, r) => s + r.rating, 0) / results.length : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface/60 p-6 sm:flex-row sm:items-center">
        <div className="text-center sm:w-40">
          <p className="text-4xl font-bold text-foreground">{average.toFixed(1)}</p>
          <RatingStars value={average} size={16} className="mt-2 justify-center" />
          <p className="mt-1 text-xs text-muted-foreground">{total} reviews</p>
        </div>
        <div className="flex-1 text-sm text-muted-foreground">
          Ratings are collected from enrolled students only, so you can trust what you read.
        </div>
      </div>

      {/* Review form / status */}
      {authenticated && isEnrolled && (
        <ReviewForm
          existing={myReview.data?.review ?? null}
          loading={myReview.isLoading}
          submitting={submit.isPending}
          onSubmit={(payload) =>
            submit.mutate(payload, {
              onSuccess: () => toast.success("Thanks for sharing your review!"),
              onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not submit review."),
            })
          }
        />
      )}
      {authenticated && !isEnrolled && (
        <p className="rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
          Only enrolled students can leave a review.
        </p>
      )}
      {!authenticated && (
        <p className="rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
          <button onClick={() => navigate("/login")} className="font-medium text-primary hover:underline">
            Sign in
          </button>{" "}
          to leave a review.
        </p>
      )}

      {reviews.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Be the first to share your experience with this course." />
      ) : (
        <>
          <ul className="space-y-5">
            {results.map((review) => (
              <li key={review.id} className="rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={review.student.avatar} name={review.student.full_name} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{review.student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <RatingStars value={review.rating} size={14} />
                </div>
                {review.title && <h3 className="mt-3 font-semibold text-foreground">{review.title}</h3>}
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{plainText(review.body)}</p>
                {review.is_verified_enrollment && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-success">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    Verified enrollment
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={5} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ReviewForm({
  existing,
  loading,
  submitting,
  onSubmit,
}: {
  existing: { rating: number; title: string; body: string } | null;
  loading: boolean;
  submitting: boolean;
  onSubmit: (payload: { rating: number; title?: string; body?: string }) => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Skeleton className="h-40 rounded-xl" />;

  if (existing) {
    return (
      <div className="rounded-xl border border-success/30 bg-green-50/50 p-5">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          You have already reviewed this course.
        </p>
        <div className="mt-2">
          <RatingStars value={existing.rating} size={14} />
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }
    setError(null);
    onSubmit({ rating, title: title.trim() || undefined, body: body.trim() || undefined });
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-border p-5">
      <h3 className="text-base font-semibold">Write a review</h3>
      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Your rating</Label>
          <RatingInput value={rating} onChange={setRating} />
          <FieldError>{error}</FieldError>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-title">Title</Label>
          <Input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarise your experience"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-body">Review</Label>
          <Textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you like? What could be better?"
            maxLength={4000}
          />
        </div>
        <Button type="submit" loading={submitting}>
          Submit review
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
function CourseDetailSkeleton() {
  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container py-14">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-10 w-3/4" />
          <Skeleton className="mt-3 h-5 w-2/3" />
          <div className="mt-6 flex gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </section>
      <div className="container grid gap-10 py-14 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="hidden h-96 w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
