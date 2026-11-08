import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  FileText,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/ui/smart-image";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import {
  useCreateCourse,
  useCreateLesson,
  useCreateSection,
  useDeleteLesson,
  useDeleteSection,
  useInstructorCourse,
  useInstructorLesson,
  useCourseSections,
  useUpdateCourse,
  useUpdateLesson,
  useUpdateSection,
  useUploadCourseThumbnail,
  useSubmitCourse,
  useArchiveCourse,
  useCategories,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { courseStatusLabels, difficultyLabels, formatDuration } from "@/lib/utils";
import type { CourseDetail, Lesson, Section, CourseStatus } from "@/types";

const statusVariant: Record<CourseStatus, "success" | "warning" | "danger" | "secondary" | "default"> = {
  published: "success",
  pending: "warning",
  rejected: "danger",
  draft: "secondary",
  archived: "secondary",
};

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

/* ------------------------------------------------------------------ */
/* Details                                                            */
/* ------------------------------------------------------------------ */

const detailsSchema = z.object({
  title: z.string().trim().min(8, "Give your course a descriptive title (8+ characters)"),
  subtitle: z.string().trim().max(140, "Keep the subtitle under 140 characters").optional(),
  description: z.string().trim().min(30, "Write at least 30 characters describing your course"),
  category: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a price like 49 or 49.99 (use 0 for free)"),
  currency: z.string(),
  learning_objectives: z.string().optional(),
  requirements: z.string().optional(),
  promo_video_url: z.string().trim().url("Enter a valid URL").or(z.literal("")),
});
type DetailsValues = z.infer<typeof detailsSchema>;

function CourseDetailsForm({ course, isNew }: { course?: CourseDetail; isNew: boolean }) {
  const navigate = useNavigate();
  const categories = useCategories();
  const create = useCreateCourse();
  const update = useUpdateCourse(course?.id ?? 0);

  const defaults = useMemo<DetailsValues>(
    () => ({
      title: course?.title ?? "",
      subtitle: course?.subtitle ?? "",
      description: course?.description ?? "",
      category: course?.category ? String(course.category.id) : "",
      difficulty: course?.difficulty ?? "beginner",
      price: course ? (course.price_cents / 100).toFixed(course.price_cents % 100 === 0 ? 0 : 2) : "0",
      currency: course?.currency ?? "usd",
      learning_objectives: listToLines(course?.learning_objectives),
      requirements: listToLines(course?.requirements),
      promo_video_url: course?.promo_video_url ?? "",
    }),
    [course],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DetailsValues>({ resolver: zodResolver(detailsSchema), defaultValues: defaults });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const onSubmit = async (values: DetailsValues) => {
    const payload = {
      title: values.title,
      subtitle: values.subtitle ?? "",
      description: values.description,
      category: values.category ? Number(values.category) : null,
      difficulty: values.difficulty,
      price_cents: Math.round(Number(values.price) * 100),
      currency: values.currency,
      learning_objectives: linesToList(values.learning_objectives ?? ""),
      requirements: linesToList(values.requirements ?? ""),
      promo_video_url: values.promo_video_url ?? "",
    };
    try {
      if (isNew) {
        const created = await create.mutateAsync(payload);
        toast.success("Course created — add some lessons next.");
        navigate(`/instructor/courses/${created.id}/edit`, { replace: true });
      } else if (course) {
        await update.mutateAsync(payload);
        toast.success("Course details saved.");
      }
    } catch (error) {
      setError("root", {
        message: error instanceof ApiError ? error.message : "We could not save your course.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {errors.root && (
        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {errors.root.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Course basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" aria-invalid={Boolean(errors.title)} {...register("title")} />
            <FieldError>{errors.title?.message}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              placeholder="A one-line summary shown on cards"
              aria-invalid={Boolean(errors.subtitle)}
              {...register("subtitle")}
            />
            <FieldError>{errors.subtitle?.message}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={6} aria-invalid={Boolean(errors.description)} {...register("description")} />
            <FieldError>{errors.description?.message}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select id="category" {...register("category")}>
                <option value="">Uncategorised</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="difficulty">Level</Label>
              <Select id="difficulty" {...register("difficulty")}>
                {Object.entries(difficultyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <div className="flex gap-2">
                <Select id="currency" className="w-24" {...register("currency")}>
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                </Select>
                <Input id="price" inputMode="decimal" aria-invalid={Boolean(errors.price)} {...register("price")} />
              </div>
              <FieldError>{errors.price?.message}</FieldError>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promo_video_url">Promo video URL</Label>
            <Input
              id="promo_video_url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              aria-invalid={Boolean(errors.promo_video_url)}
              {...register("promo_video_url")}
            />
            <FieldError>{errors.promo_video_url?.message}</FieldError>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What students will learn</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="learning_objectives">Learning objectives</Label>
            <Textarea
              id="learning_objectives"
              rows={6}
              placeholder={"One objective per line\nBuild a REST API\nDeploy to production"}
              {...register("learning_objectives")}
            />
            <p className="text-xs text-muted-foreground">Enter one item per line.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              rows={6}
              placeholder={"One requirement per line\nBasic JavaScript\nA computer"}
              {...register("requirements")}
            />
            <p className="text-xs text-muted-foreground">Enter one item per line.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" loading={isSubmitting}>
          {isNew ? "Create course" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Thumbnail                                                          */
/* ------------------------------------------------------------------ */

function ThumbnailCard({ course }: { course: CourseDetail }) {
  const upload = useUploadCourseThumbnail(course.id);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: () => toast.success("Thumbnail updated."),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "Upload failed."),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thumbnail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SmartImage
          src={course.thumbnail_url}
          alt="Course thumbnail"
          ratioClassName="aspect-[16/9]"
          className="rounded-lg"
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold shadow-sm hover:bg-muted">
          <Upload className="h-4 w-4" aria-hidden />
          {upload.isPending ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 5 MB. Recommended 16:9.</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Curriculum                                                         */
/* ------------------------------------------------------------------ */

function CurriculumManager({ courseId }: { courseId: number }) {
  const sections = useCourseSections(courseId);
  const createSection = useCreateSection(courseId);
  const updateSection = useUpdateSection(courseId);
  const deleteSection = useDeleteSection(courseId);
  const deleteLesson = useDeleteLesson(courseId);

  const [sectionModal, setSectionModal] = useState<{ open: boolean; section?: Section }>({ open: false });
  const [lessonModal, setLessonModal] = useState<{ open: boolean; sectionId?: number; lesson?: Lesson }>({
    open: false,
  });
  const [confirm, setConfirm] = useState<{ type: "section" | "lesson"; id: number; title: string } | null>(null);

  const list = sections.data ?? [];

  const onConfirmDelete = () => {
    if (!confirm) return;
    const mutation = confirm.type === "section" ? deleteSection : deleteLesson;
    mutation.mutate(confirm.id, {
      onSuccess: () => {
        toast.success(confirm.type === "section" ? "Section removed." : "Lesson removed.");
        setConfirm(null);
      },
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "Could not delete."),
    });
  };

  return (
    <div className="space-y-5">
      {sections.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : sections.isError ? (
        <ErrorState message="We could not load the curriculum." onRetry={() => sections.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No sections yet"
          description="Organise your course into sections, then add lessons to each section."
          action={
            <Button onClick={() => setSectionModal({ open: true })}>
              <Plus />
              Add section
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {list.map((section, index) => (
            <li key={section.id}>
              <Card>
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <GripVertical className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                      <span className="text-xs font-medium text-muted-foreground">Section {index + 1}</span>
                      {section.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSectionModal({ open: true, section })}>
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete section"
                    className="text-danger hover:bg-red-50"
                    onClick={() => setConfirm({ type: "section", id: section.id, title: section.title })}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <ul className="divide-y divide-border">
                  {section.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(lesson.duration_minutes)}
                          {lesson.is_preview ? " · Free preview" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLessonModal({ open: true, sectionId: section.id, lesson: lesson as Lesson })}
                      >
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete lesson"
                        className="text-danger hover:bg-red-50"
                        onClick={() => setConfirm({ type: "lesson", id: lesson.id, title: lesson.title })}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                  <li className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLessonModal({ open: true, sectionId: section.id })}
                    >
                      <Plus />
                      Add lesson
                    </Button>
                  </li>
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {list.length > 0 && (
        <Button variant="outline" onClick={() => setSectionModal({ open: true })}>
          <Plus />
          Add section
        </Button>
      )}

      <SectionModal
        courseId={courseId}
        open={sectionModal.open}
        section={sectionModal.section}
        onClose={() => setSectionModal({ open: false })}
        onSubmit={(values) => {
          if (sectionModal.section) {
            updateSection.mutate(
              { id: sectionModal.section.id, ...values },
              {
                onSuccess: () => {
                  toast.success("Section updated.");
                  setSectionModal({ open: false });
                },
                onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not save section."),
              },
            );
          } else {
            createSection.mutate(values, {
              onSuccess: () => {
                toast.success("Section added.");
                setSectionModal({ open: false });
              },
              onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not add section."),
            });
          }
        }}
        loading={createSection.isPending || updateSection.isPending}
      />

      <LessonModal
        courseId={courseId}
        open={lessonModal.open}
        sectionId={lessonModal.sectionId}
        lesson={lessonModal.lesson}
        onClose={() => setLessonModal({ open: false })}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === "section" ? "Delete section" : "Delete lesson"}
        message={
          confirm
            ? `"${confirm.title}" will be permanently deleted. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        loading={deleteSection.isPending || deleteLesson.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function SectionModal({
  open,
  section,
  onClose,
  onSubmit,
  loading,
}: {
  courseId: number;
  open: boolean;
  section?: Section;
  onClose: () => void;
  onSubmit: (values: { title: string; summary?: string }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(section?.title ?? "");
      setSummary(section?.summary ?? "");
    }
  }, [open, section]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? "Edit section" : "Add section"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => title.trim() && onSubmit({ title: title.trim(), summary: summary.trim() })}
            loading={loading}
            disabled={!title.trim()}
            data-autofocus
          >
            {section ? "Save" : "Add section"}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="section-title">Section title</Label>
        <Input
          id="section-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Getting started"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="section-summary">Summary (optional)</Label>
        <Textarea
          id="section-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What this section covers"
        />
      </div>
    </Modal>
  );
}

function LessonModal({
  open,
  sectionId,
  lesson,
  onClose,
}: {
  courseId: number;
  open: boolean;
  sectionId?: number;
  lesson?: Lesson;
  onClose: () => void;
}) {
  const isEdit = Boolean(lesson?.id);
  const detail = useInstructorLesson(lesson?.id, open && isEdit);
  const courseId = useParamsCourseId();

  const create = useCreateLesson(sectionId ?? 0, courseId);
  const update = useUpdateLesson(courseId);

  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    video_url: "",
    duration_minutes: "0",
    is_preview: false,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && detail.data) {
      const l = detail.data;
      setForm({
        title: l.title,
        description: l.description,
        content: l.content,
        video_url: l.video_url,
        duration_minutes: String(l.duration_minutes),
        is_preview: l.is_preview,
      });
    } else if (!isEdit) {
      setForm({ title: "", description: "", content: "", video_url: "", duration_minutes: "0", is_preview: false });
    }
  }, [open, isEdit, detail.data]);

  const payload = {
    title: form.title.trim(),
    description: form.description,
    content: form.content,
    video_url: form.video_url,
    duration_minutes: Number(form.duration_minutes) || 0,
    is_preview: form.is_preview,
  };

  const onSave = () => {
    if (!payload.title) return;
    if (isEdit && lesson) {
      update.mutate(
        { id: lesson.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Lesson saved.");
            onClose();
          },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not save lesson."),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Lesson added.");
          onClose();
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not add lesson."),
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit lesson" : "Add lesson"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending || update.isPending}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            loading={create.isPending || update.isPending}
            disabled={!payload.title}
            data-autofocus
          >
            {isEdit ? "Save lesson" : "Add lesson"}
          </Button>
        </>
      }
    >
      {isEdit && detail.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Setting up your environment"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-description">Short description</Label>
            <Input
              id="lesson-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-video">Video URL</Label>
              <Input
                id="lesson-video"
                type="url"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-duration">Duration (minutes)</Label>
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-content">Lesson notes</Label>
            <Textarea
              id="lesson-content"
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Text content shown alongside the video."
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.is_preview}
              onChange={(e) => setForm({ ...form, is_preview: e.target.checked })}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring/40"
            />
            Make this a free preview (visible before enrolling)
          </label>
        </>
      )}
    </Modal>
  );
}

/** Reads the course id from the current route for nested mutations. */
function useParamsCourseId(): number {
  const { id } = useParams();
  return Number(id) || 0;
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const courseId = isNew ? undefined : Number(id);
  const course = useInstructorCourse(courseId);
  const [tab, setTab] = useState("details");

  const submit = useSubmitCourse();
  const archive = useArchiveCourse();

  if (isNew) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow={
            <Link
              to="/instructor/courses"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              My courses
            </Link>
          }
          title="Create a new course"
          description="Start with the basics — you can add lessons and submit for review next."
        />
        <CourseDetailsForm isNew />
      </div>
    );
  }

  if (course.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (course.isError || !course.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState title="Course not found" message="This course doesn't exist or isn't yours." />
      </div>
    );
  }

  const data = course.data;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/instructor/courses"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        My courses
      </Link>

      <PageHeader
        title={data.title}
        description={data.subtitle || "Manage your course details and curriculum."}
        actions={
          <>
            <Badge variant={statusVariant[data.status]}>{courseStatusLabels[data.status] ?? data.status}</Badge>
            {data.status !== "published" && (
              <Link to={`/courses/${data.slug}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <Eye />
                  Preview
                </Button>
              </Link>
            )}
            {data.status === "published" && (
              <Link to={`/courses/${data.slug}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <Eye />
                  View live
                </Button>
              </Link>
            )}
            {(data.status === "draft" || data.status === "rejected") && (
              <Button
                size="sm"
                loading={submit.isPending}
                onClick={() =>
                  submit.mutate(data.id, {
                    onSuccess: () => toast.success("Course submitted for review."),
                    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not submit."),
                  })
                }
              >
                <Send />
                Submit for review
              </Button>
            )}
            {data.status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                loading={archive.isPending}
                onClick={() =>
                  archive.mutate(data.id, {
                    onSuccess: () => toast.success("Course archived."),
                    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not archive."),
                  })
                }
              >
                Archive
              </Button>
            )}
          </>
        }
      />

      {data.status === "rejected" && data.moderation_note && (
        <Card className="mb-6 border-danger/30 bg-red-50/60 p-4">
          <p className="text-sm font-medium text-danger">Changes requested</p>
          <p className="mt-1 text-sm text-neutral-700">{data.moderation_note}</p>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6"
        tabs={[
          { value: "details", label: "Details" },
          { value: "curriculum", label: "Curriculum" },
        ]}
      />

      {tab === "details" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <CourseDetailsForm course={data} isNew={false} />
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <ThumbnailCard course={data} />
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <SummaryRow label="Lessons" value={String(data.lesson_count)} />
                <SummaryRow label="Duration" value={formatDuration(data.total_duration_minutes)} />
                <SummaryRow label="Students" value={String(data.enrollment_count)} />
                <SummaryRow label="Price" value={data.price} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <CurriculumManager courseId={data.id} />
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
