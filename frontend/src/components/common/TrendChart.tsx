import { cn } from "@/lib/utils";

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  /** Formats the value shown in each bar's tooltip. */
  formatValue?: (value: number) => string;
  /** Accessible description of what the chart shows. */
  label: string;
  colorClassName?: string;
  className?: string;
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Dependency-free bar chart for the dashboard trend series. Renders an
 * accessible list underneath so screen readers and tests get the raw numbers.
 */
export function TrendChart({ data, formatValue, label, colorClassName, className }: TrendChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={className}>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label={label}>
        {data.map((point) => {
          const height = Math.max(4, Math.round((point.value / max) * 100));
          return (
            <div key={point.date} className="group relative flex flex-1 flex-col items-center justify-end">
              <span
                className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white group-hover:block"
                aria-hidden
              >
                {formatValue ? formatValue(point.value) : point.value} · {shortDate(point.date)}
              </span>
              <div
                className={cn("w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary", colorClassName)}
                style={{ height: `${height}%` }}
                title={`${shortDate(point.date)}: ${formatValue ? formatValue(point.value) : point.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        {data.length > 0 && <span>{shortDate(data[0].date)}</span>}
        {data.length > 1 && <span>{shortDate(data[data.length - 1].date)}</span>}
      </div>
      <ul className="sr-only">
        {data.map((point) => (
          <li key={point.date}>
            {shortDate(point.date)}: {formatValue ? formatValue(point.value) : point.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
