"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Drawer (sheet lateral) — Radix Dialog com posicionamento fixo à direita.
 * Usado para Notas da Conta, Detalhes de Anúncio, etc.
 */
export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: "right" | "left";
    width?: string;
  }
>(({ className, children, side = "right", width = "440px", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed top-0 bottom-0 z-50 flex flex-col",
        "bg-bg-surface border-line shadow-elev-2",
        side === "right" ? "right-0 border-l" : "left-0 border-r",
        side === "right"
          ? "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
          : "data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left",
        "duration-300",
        className
      )}
      style={{ width }}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DrawerContent.displayName = "DrawerContent";

export function DrawerHeader({
  children,
  onClose,
  className,
  eyebrow,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 px-5 py-4 border-b border-line", className)}>
      <div className="flex-1 min-w-0">
        {eyebrow && <p className="eyebrow text-accent mb-1.5">{eyebrow}</p>}
        <DialogPrimitive.Title asChild>
          <h2 className="text-md font-semibold text-ink leading-tight">{children}</h2>
        </DialogPrimitive.Title>
      </div>
      <DialogPrimitive.Close asChild>
        <button
          type="button"
          onClick={onClose}
          className="size-7 rounded-md grid place-items-center text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer shrink-0 mt-0.5"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </DialogPrimitive.Close>
    </div>
  );
}

export function DrawerBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 overflow-y-auto p-5", className)}>{children}</div>;
}

export function DrawerFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 px-5 py-3.5 border-t border-line", className)}>
      {children}
    </div>
  );
}

export const DrawerTitle = DialogPrimitive.Title;
export const DrawerDescription = DialogPrimitive.Description;
