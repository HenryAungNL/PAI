import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Optional content rendered above the title (e.g. a back link). */
  eyebrow?: React.ReactNode;
}

export function PageHeader({ title, description, actions, className, eyebrow }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        {eyebrow}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
