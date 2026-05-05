"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, AlertTriangle, X, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "default" | "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  tone: ToastTone;
  duration?: number;
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, "id"> & { id?: string }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}

const variants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border p-3.5 pr-9 shadow-elev-2 backdrop-blur",
  {
    variants: {
      tone: {
        default: "bg-bg-elevated border-line",
        success: "bg-bg-elevated border-positive/30",
        error:   "bg-bg-elevated border-negative/30",
        warning: "bg-bg-elevated border-warning/30",
        info:    "bg-bg-elevated border-info/30",
      },
    },
    defaultVariants: { tone: "default" },
  }
);

const ICONS: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLOR: Record<ToastTone, string> = {
  default: "text-ink-muted",
  success: "text-positive",
  error: "text-negative",
  warning: "text-warning",
  info: "text-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((t: Omit<ToastItem, "id"> & { id?: string }) => {
    const id = t.id ?? Math.random().toString(36).slice(2);
    setItems((curr) => [...curr, { id, tone: t.tone, title: t.title, description: t.description, duration: t.duration }]);
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      <ToastPrimitive.Provider duration={4500} swipeDirection="right">
        {children}
        {items.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <ToastPrimitive.Root
              key={item.id}
              duration={item.duration}
              onOpenChange={(open) => {
                if (!open) remove(item.id);
              }}
              className={cn(
                variants({ tone: item.tone }),
                "data-[state=open]:animate-slide-up",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
                "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
                "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform",
                "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:animate-out"
              )}
            >
              <Icon className={cn("size-4 mt-0.5 shrink-0", ICON_COLOR[item.tone])} />
              <div className="flex-1 min-w-0">
                {item.title ? (
                  <ToastPrimitive.Title className="text-sm font-medium text-ink leading-tight">
                    {item.title}
                  </ToastPrimitive.Title>
                ) : null}
                {item.description ? (
                  <ToastPrimitive.Description className="text-xs text-ink-muted mt-0.5 leading-snug">
                    {item.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                className="absolute right-2 top-2 size-6 rounded inline-flex items-center justify-center text-ink-dim hover:text-ink hover:bg-bg-surface transition-colors"
                aria-label="Fechar"
              >
                <X className="size-3.5" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
