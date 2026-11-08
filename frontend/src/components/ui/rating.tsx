import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  size?: number;
  className?: string;
  showValue?: boolean;
}

export function RatingStars({ value, size = 16, className, showValue }: RatingStarsProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex items-center" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            width={size}
            height={size}
            className={cn(
              "shrink-0",
              star <= Math.round(value) ? "fill-primary text-primary" : "fill-neutral-200 text-neutral-200",
            )}
          />
        ))}
      </span>
      {showValue && <span className="text-sm font-medium text-foreground">{value.toFixed(1)}</span>}
    </span>
  );
}

/** Accessible, interactive rating input used by the review form. */
export function RatingInput({
  value,
  onChange,
  name = "rating",
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          name={name}
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className={cn("h-6 w-6", star <= value ? "fill-primary text-primary" : "fill-neutral-200 text-neutral-300")} />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value ? `${value}/5` : "Select a rating"}</span>
    </div>
  );
}
