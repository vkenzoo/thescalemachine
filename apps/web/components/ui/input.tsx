"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, mono, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full rounded-md bg-bg-inset px-3 text-sm",
        "border border-line placeholder:text-ink-dim",
        "transition-[border-color,box-shadow] duration-150",
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
Input.displayName = "Input";
