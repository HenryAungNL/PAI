import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-white", sizes[size], className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 ring-2 ring-white",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
