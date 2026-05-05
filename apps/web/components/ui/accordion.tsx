"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface AccordionContextValue {
  open: Set<string>;
  toggle: (id: string) => void;
  type: "single" | "multiple";
}

const Ctx = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  children,
  type = "single",
  defaultOpen = [],
  className,
}: {
  children: React.ReactNode;
  type?: "single" | "multiple";
  defaultOpen?: string[];
  className?: string;
}) {
  const [open, setOpen] = React.useState<Set<string>>(new Set(defaultOpen));

  const toggle = React.useCallback(
    (id: string) => {
      setOpen((curr) => {
        const next = new Set(type === "single" && !curr.has(id) ? [] : curr);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [type]
  );

  return (
    <Ctx.Provider value={{ open, toggle, type }}>
      <div className={cn("divide-y divide-line border border-line rounded-lg overflow-hidden bg-bg-surface", className)}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function AccordionItem({
  id,
  title,
  badge,
  children,
}: {
  id: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("AccordionItem must be inside <Accordion>");
  const isOpen = ctx.open.has(id);

  return (
    <div className="bg-bg-surface">
      <button
        type="button"
        onClick={() => ctx.toggle(id)}
        aria-expanded={isOpen}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-bg-elevated transition-colors cursor-pointer"
      >
        <span className="flex-1 text-sm font-medium text-ink">{title}</span>
        {badge}
        <ChevronDown
          className={cn(
            "size-4 text-ink-dim transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 text-sm text-ink-muted leading-relaxed animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
