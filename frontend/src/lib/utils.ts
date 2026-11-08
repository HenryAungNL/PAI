import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format integer minor currency units as a price string. */
export function formatPrice(cents: number, currency = "usd"): string {
  if (cents === 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

/** Human-friendly duration from total minutes. */
export function formatDuration(minutes: number): string {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours}h ${mins}m`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRating(rating: string | number | null | undefined): string {
  const value = typeof rating === "string" ? Number.parseFloat(rating) : (rating ?? 0);
  if (!value) return "New";
  return value.toFixed(1);
}

export function initials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/** Strip simple markdown-ish artifacts for previews. */
export function plainText(text: string): string {
  return text.replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
}

export const difficultyLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const courseStatusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export const orderStatusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};
