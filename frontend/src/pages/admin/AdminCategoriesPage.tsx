import { useState } from "react";
import { FolderTree, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { CategoryIcon } from "@/components/courses/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import type { Category } from "@/types";

const iconOptions = [
  "Code2",
  "Briefcase",
  "Palette",
  "Megaphone",
  "BrainCircuit",
  "Sparkles",
  "LineChart",
  "Languages",
  "GraduationCap",
];

export function AdminCategoriesPage() {
  const categories = useAdminCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const remove = useDeleteCategory();

  const list = categories.data ?? [];

  const onDelete = () => {
    if (!confirmDelete) return;
    remove.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast.success("Category deleted.");
        setConfirmDelete(null);
      },
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "Could not delete this category."),
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Categories"
        description="Organise the catalogue. Categories with courses can't be deleted."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            New category
          </Button>
        }
      />

      {categories.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : categories.isError ? (
        <ErrorState message="We could not load categories." onRetry={() => categories.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Create your first category to start organising courses."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus />
              New category
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {list.map((category) => (
            <div key={category.id} className="flex items-center gap-4 p-4">
              <GripVertical className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <CategoryIcon name={category.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  {category.name}
                  {!category.is_active && <Badge variant="secondary">Hidden</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  /{category.slug} · {category.course_count ?? 0} course
                  {(category.course_count ?? 0) === 1 ? "" : "s"} · position {category.order}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(category)}>
                <Pencil />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete category"
                className="text-danger hover:bg-red-50"
                onClick={() => setConfirmDelete(category)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <CategoryModal
        open={creating || Boolean(editing)}
        category={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete category"
        message={
          confirmDelete
            ? `"${confirmDelete.name}" will be removed. Categories that still have courses cannot be deleted.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function CategoryModal({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "GraduationCap",
    image_url: "",
    order: "0",
    is_active: true,
  });
  const [error, setError] = useState<string | null>(null);

  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = open ? String(category?.id ?? "new") : null;
  if (open && key !== lastKey) {
    setLastKey(key);
    setError(null);
    setForm({
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      icon: category?.icon ?? "GraduationCap",
      image_url: category?.image_url ?? "",
      order: String(category?.order ?? 0),
      is_active: category?.is_active ?? true,
    });
  }

  const onSave = () => {
    if (!form.name.trim()) {
      setError("A category name is required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim(),
      icon: form.icon,
      image_url: form.image_url.trim(),
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };
    const onSuccess = () => {
      toast.success(category ? "Category updated." : "Category created.");
      onClose();
    };
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : "We could not save this category.");

    if (category) {
      update.mutate({ id: category.id, ...payload }, { onSuccess, onError });
    } else {
      create.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? "Edit category" : "New category"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={create.isPending || update.isPending} data-autofocus>
            {category ? "Save changes" : "Create category"}
          </Button>
        </>
      }
    >
      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Web Development"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cat-slug">Slug</Label>
          <Input
            id="cat-slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="auto from name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-order">Position</Label>
          <Input
            id="cat-order"
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cat-icon">Icon</Label>
          <Select id="cat-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            {iconOptions.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-image">Image URL</Label>
          <Input
            id="cat-image"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://…"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-description">Description</Label>
        <Textarea
          id="cat-description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring/40"
        />
        Visible on the public site
      </label>
    </Modal>
  );
}
