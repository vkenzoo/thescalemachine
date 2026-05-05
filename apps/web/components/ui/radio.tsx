"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  /** Layout: 'cards' for big tap targets with description; 'inline' for small chips */
  layout?: "cards" | "inline";
}

interface RadioContextValue {
  value: string;
  onChange: (value: string) => void;
  layout: "cards" | "inline";
}

const Ctx = React.createContext<RadioContextValue | null>(null);

export function RadioGroup({ value, onChange, children, className, layout = "cards" }: RadioGroupProps) {
  return (
    <Ctx.Provider value={{ value, onChange, layout }}>
      <div
        role="radiogroup"
        className={cn(
          layout === "cards" ? "grid gap-2" : "inline-flex gap-1.5 flex-wrap",
          className
        )}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function RadioOption({
  value: optionValue,
  label,
  description,
  icon: Icon,
  className,
}: {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("RadioOption must be used inside <RadioGroup>");
  const checked = ctx.value === optionValue;

  if (ctx.layout === "inline") {
    return (
      <button
        type="button"
        onClick={() => ctx.onChange(optionValue)}
        role="radio"
        aria-checked={checked}
        className={cn(
          "h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer",
          checked
            ? "bg-accent-subtle text-accent border border-accent/30"
            : "bg-bg-surface text-ink-muted border border-line hover:border-line-strong hover:text-ink",
          className
        )}
      >
        {Icon && <Icon className="size-3.5 mr-1.5 inline" />}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => ctx.onChange(optionValue)}
      role="radio"
      aria-checked={checked}
      className={cn(
        "flex items-start gap-3 p-3 rounded-md border text-left transition-colors cursor-pointer",
        checked
          ? "border-accent/40 bg-accent-subtle/30"
          : "border-line bg-bg-surface hover:border-line-strong hover:bg-bg-elevated",
        className
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full border-2 grid place-items-center shrink-0 mt-0.5",
          checked ? "border-accent bg-accent" : "border-line-strong"
        )}
      >
        {checked && <span className="size-1.5 rounded-full bg-ink-inverse" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className={cn("text-sm font-medium block", checked ? "text-ink" : "text-ink-muted")}>
          {Icon && <Icon className="size-3.5 mr-1.5 inline -mt-0.5" />}
          {label}
        </span>
        {description && (
          <span className="text-2xs text-ink-dim mt-0.5 block leading-relaxed pretty">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
