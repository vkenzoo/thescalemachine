import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded font-medium tracking-tight whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:  "bg-bg-elevated text-ink-muted border border-line",
        positive: "bg-positive-subtle text-positive border border-positive/20",
        negative: "bg-negative-subtle text-negative border border-negative/20",
        warning:  "bg-warning-subtle text-warning border border-warning/20",
        info:     "bg-info-subtle text-info border border-info/20",
        accent:   "bg-accent-subtle text-accent border border-accent/30",
      },
      size: {
        xs: "h-5 px-1.5 text-2xs",
        sm: "h-6 px-2 text-xs",
        md: "h-7 px-2.5 text-xs",
      },
      dot: { true: "", false: "" },
    },
    defaultVariants: { tone: "neutral", size: "sm", dot: false },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot ? (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            tone === "positive" && "bg-positive",
            tone === "negative" && "bg-negative",
            tone === "warning" && "bg-warning",
            tone === "info" && "bg-info",
            tone === "accent" && "bg-accent",
            (!tone || tone === "neutral") && "bg-ink-muted"
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
