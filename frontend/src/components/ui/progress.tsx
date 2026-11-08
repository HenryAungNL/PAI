import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
}

export function Progress({ value, className, indicatorClassName, label }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-100", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-500 ease-out", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
