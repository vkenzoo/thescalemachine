"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

interface Props {
  value: number;        // 0..100
  max?: number;         // default 100
  size?: "xs" | "sm" | "md";
  tone?: "accent" | "positive" | "warning" | "negative";
  showLabel?: boolean;
  className?: string;
  indeterminate?: boolean;
}

/**
 * Barra de progresso simples — usada na fila do Editor e no upload.
 */
export function Progress({
  value,
  max = 100,
  size = "sm",
  tone = "accent",
  showLabel,
  indeterminate,
  className,
}: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const heights = { xs: "h-0.5", sm: "h-1", md: "h-1.5" }[size];
  const colors = {
    accent: "bg-accent",
    positive: "bg-positive",
    warning: "bg-warning",
    negative: "bg-negative",
  }[tone];

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn("relative w-full overflow-hidden rounded-full bg-bg-inset", heights)}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          <div
            className={cn("absolute inset-y-0 w-1/3 rounded-full", colors)}
            style={{
              animation: "shimmer 1.4s ease-in-out infinite",
              backgroundImage: "linear-gradient(90deg, transparent, currentColor, transparent)",
            }}
          />
        ) : (
          <div
            className={cn("h-full rounded-full transition-[width] duration-300 ease-out", colors)}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1.5 text-2xs text-ink-dim font-mono">
          <span>{Math.round(pct)}%</span>
          <span>{value} / {max}</span>
        </div>
      )}
    </div>
  );
}
