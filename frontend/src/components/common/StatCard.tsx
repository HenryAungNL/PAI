import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  tone?: "default" | "primary" | "success" | "danger";
  className?: string;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-neutral-100 text-neutral-600",
  primary: "bg-primary-50 text-primary",
  success: "bg-green-50 text-green-600",
  danger: "bg-red-50 text-danger",
};

export function StatCard({ label, value, icon: Icon, hint, tone = "primary", className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
      </div>
    </Card>
  );
}
