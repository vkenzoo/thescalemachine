"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, mono, ...props }, ref) => (
    <textarea
      ref={ref}
      data-invalid={invalid || undefined}
      className={cn(
        "flex min-h-[80px] w-full rounded-md bg-bg-inset px-3 py-2 text-sm",
        "border border-line placeholder:text-ink-dim",
        "transition-[border-color,box-shadow] duration-150 resize-y",
        "hover:border-line-strong",
        "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[invalid=true]:border-negative data-[invalid=true]:focus-visible:ring-negative/40",
        mono && "font-mono text-xs tracking-tight",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
