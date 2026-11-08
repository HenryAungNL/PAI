import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-foreground", className)} {...props}>
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-danger">{children}</p>;
}

export function HelperText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
