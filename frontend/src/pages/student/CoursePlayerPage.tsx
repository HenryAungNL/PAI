import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Lock,
  PartyPopper,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { usePlayer, useToggleLessonComplete } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { cn, formatDuration } from "@/lib/utils";
import type { Lesson, Section } from "@/types";

/** Turn common video URLs (YouTube/Vimeo) into embeddable ones. */
function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id) || undefined;
  const player = usePlayer(courseId);
  const toggleComplete = useToggleLessonComplete(courseId ?? 0);

  const sections = useMemo<Section<Lesson>[]>(() => player.data?.sections ?? [], [player.data]);
  const flatLessons = useMemo(() => sections.flatMap((s) => s.lessons), [sections]);
  const completedIds = useMemo(() => new Set(player.data?.completed_lesson_ids ?? []), [player.data]);

  const [activeId, setActiveId] = useState<number | null>(null);

  // Pick a sensible starting lesson once the payload arrives: first incomplete,
  // otherwise the first lesson.
  useEffect(() => {
    if (activeId !== null || flatLessons.length === 0) return;
    const firstIncomplete = flatLessons.find((l) => !completedIds.has(l.id));
    setActiveId((firstIncomplete ?? flatLessons[0]).id);
  }, [flatLessons, completedIds, activeId]);

  const activeIndex = flatLessons.findIndex((l) => l.id === activeId);
  const activeLesson = activeIndex >= 0 ? flatLessons[activeIndex] : undefined;
  const prevLesson = activeIndex > 0 ? flatLessons[activeIndex - 1] : undefined;
  const nextLesson = activeIndex >= 0 && activeIndex < flatLessons.length - 1 ? flatLessons[activeIndex + 1] : undefined;

  const progress = player.data?.progress_percent ?? 0;
  const isComplete = progress >= 100;

  const onToggle = (lesson: Lesson, completed: boolean) => {
    toggleComplete.mutate(
      { lessonId: lesson.id, completed },
      {
        onSuccess: (result) => {
          if (result.course_completed && completed) {
            toast.success("Congratulations — you've completed the course!");
          } else {
            toast.success(completed ? "Lesson marked complete." : "Lesson marked incomplete.");
          }
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "We could not update your progress."),
      },
    );
  };

  if (player.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
    );
  }

  if (player.isError) {
    const notEnrolled = player.error instanceof ApiError && player.error.status === 403;
    return (
      <div className="mx-auto max-w-2xl">
        {notEnrolled ? (
          <EmptyState
            icon={Lock}
            title="You don't have access to this course"
            description="Enrol in this course to unlock all of its lessons."
            action={
              <Link to="/courses">
                <Button>Browse courses</Button>
              </Link>
            }
          />
        ) : (
          <ErrorState
            title="We couldn't load this course"
            message="The course may have been removed or is temporarily unavailable."
            onRetry={() => player.refetch()}
          />
        )}
      </div>
    );
  }

  if (!player.data || flatLessons.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={PlayCircle}
          title="No lessons yet"
          description="This course doesn't have any lessons published yet."
          action={
            <Link to="/dashboard/learning">
              <Button>Back to my learning</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const embed = activeLesson ? toEmbedUrl(activeLesson.video_url) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/dashboard/learning"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to my learning
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{player.data.course.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {player.data.course.instructor.full_name} · {flatLessons.length} lessons
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={progress} label="Course progress" className="max-w-md" />
          <span className="shrink-0 text-sm font-medium text-foreground">{progress}%</span>
        </div>
      </header>

      {isComplete && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-success/30 bg-green-50/60 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
            <PartyPopper className="h-5 w-5" aria-hidden />
            You've completed this course — your certificate is ready.
          </p>
          <Link to="/dashboard/certificates">
            <Button size="sm">View certificate</Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Lesson content */}
        <div className="min-w-0">
          {activeLesson && (
            <div className="space-y-5">
              <div className="aspect-video overflow-hidden rounded-xl border border-border bg-neutral-900">
                {embed ? (
                  <iframe
                    src={embed}
                    title={activeLesson.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/80">
                    <PlayCircle className="h-14 w-14" aria-hidden />
                    <p className="px-6 text-sm">
                      {activeLesson.video_url
                        ? "This lesson's video opens in a new tab."
                        : "This lesson is text-based — read on below."}
                    </p>
                    {activeLesson.video_url && (
                      <a href={activeLesson.video_url} target="_blank" rel="noreferrer">
                        <Button variant="secondary" size="sm">
                          Open video
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{activeLesson.title}</h2>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {activeLesson.duration_minutes > 0 && (
                      <span>{formatDuration(activeLesson.duration_minutes)}</span>
                    )}
                    {completedIds.has(activeLesson.id) && (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant={completedIds.has(activeLesson.id) ? "outline" : "success"}
                  loading={toggleComplete.isPending}
                  onClick={() => onToggle(activeLesson, !completedIds.has(activeLesson.id))}
                >
                  <CheckCircle2 />
                  {completedIds.has(activeLesson.id) ? "Mark incomplete" : "Mark complete"}
                </Button>
              </div>

              {activeLesson.description && (
                <p className="text-muted-foreground">{activeLesson.description}</p>
              )}

              {activeLesson.content && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" aria-hidden />
                    Lesson notes
                  </div>
                  <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                    {activeLesson.content}
                  </div>
                </Card>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && setActiveId(prevLesson.id)}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <Button
                  disabled={!nextLesson}
                  onClick={() => nextLesson && setActiveId(nextLesson.id)}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Curriculum sidebar */}
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto scrollbar-thin">
          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Course content</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {completedIds.size} of {flatLessons.length} lessons complete
              </p>
            </div>
            <ol className="divide-y divide-border">
              {sections.map((section) => (
                <li key={section.id}>
                  <div className="bg-surface/70 px-4 py-2.5">
                    <p className="text-sm font-semibold text-foreground">{section.title}</p>
                  </div>
                  <ul className="divide-y divide-border">
                    {section.lessons.map((lesson) => {
                      const done = completedIds.has(lesson.id);
                      const active = lesson.id === activeId;
                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            onClick={() => setActiveId(lesson.id)}
                            aria-current={active ? "true" : undefined}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                              active ? "bg-primary-50" : "hover:bg-muted",
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
                            )}
                            <span className={cn("min-w-0 flex-1 line-clamp-2", active ? "font-medium text-primary-700" : "text-foreground")}>
                              {lesson.title}
                            </span>
                            {lesson.duration_minutes > 0 && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {lesson.duration_minutes}m
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}
