import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary">
          <Icon className="h-7 w-7" aria-hidden />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/60 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-danger">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-neutral-600">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-danger/30 bg-white px-4 py-2 text-sm font-semibold text-danger hover:bg-red-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}
