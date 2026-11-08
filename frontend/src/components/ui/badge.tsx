import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-50 text-primary-700",
        solid: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-neutral-100 text-neutral-700",
        outline: "border-border text-foreground",
        success: "border-transparent bg-green-50 text-green-700",
        warning: "border-transparent bg-amber-50 text-amber-700",
        danger: "border-transparent bg-red-50 text-red-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
