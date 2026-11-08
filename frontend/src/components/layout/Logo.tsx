import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn("inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight", className)}
      aria-label="PAI home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="h-5 w-5" aria-hidden />
      </span>
      {!compact && <span className="text-foreground">PAI</span>}
    </Link>
  );
}
