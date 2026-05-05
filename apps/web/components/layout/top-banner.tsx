"use client";

import * as React from "react";
import { AlertTriangle, X, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

type BannerTone = "info" | "warning" | "danger" | "success";

interface BannerItem {
  id: string;
  tone: BannerTone;
  message: React.ReactNode;
  cta?: { label: string; onClick?: () => void; href?: string };
  dismissible?: boolean;
}

interface BannerContextValue {
  push: (b: Omit<BannerItem, "id"> & { id?: string }) => void;
  dismiss: (id: string) => void;
}

const Ctx = React.createContext<BannerContextValue | null>(null);

export function useBanner() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useBanner deve ser usado dentro de <BannerProvider>");
  return ctx;
}

export function BannerProvider({ children }: { children: React.ReactNode }) {
  // Banner default sempre presente — plano expirando (mock)
  const [items, setItems] = React.useState<BannerItem[]>([
    {
      id: "plan-expiry",
      tone: "warning",
      message: (
        <>
          Seu plano <strong className="font-semibold">Pro</strong> expira em{" "}
          <strong className="font-semibold">7 dias</strong>. Renove já e não perca suas funcionalidades.
        </>
      ),
      cta: { label: "Renovar plano", href: "/billing" },
      dismissible: true,
    },
  ]);

  const push = React.useCallback((b: Omit<BannerItem, "id"> & { id?: string }) => {
    const id = b.id ?? Math.random().toString(36).slice(2);
    setItems((curr) => [...curr.filter((x) => x.id !== id), { ...b, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setItems((curr) => curr.filter((b) => b.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ push, dismiss }}>
      {items.length > 0 && (
        <div className="flex flex-col">
          {items.map((b) => (
            <Bar key={b.id} {...b} onDismiss={() => dismiss(b.id)} />
          ))}
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}

function Bar({ tone, message, cta, dismissible, onDismiss }: BannerItem & { onDismiss: () => void }) {
  const Icon = tone === "danger" ? AlertTriangle : tone === "warning" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info;
  const cls = {
    info:    "bg-info/10 border-info/30 text-info",
    warning: "bg-warning/10 border-warning/30 text-warning",
    danger:  "bg-negative/10 border-negative/30 text-negative",
    success: "bg-positive/10 border-positive/30 text-positive",
  }[tone];

  return (
    <div className={cn("border-b px-5 h-9 flex items-center gap-3 text-xs", cls)}>
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 text-ink">{message}</span>
      {cta && (
        <a
          href={cta.href}
          onClick={cta.onClick}
          className="font-medium underline-offset-4 hover:underline cursor-pointer"
        >
          {cta.label} →
        </a>
      )}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="size-5 inline-flex items-center justify-center rounded text-current opacity-70 hover:opacity-100 hover:bg-current/10 transition-all cursor-pointer"
          aria-label="Fechar aviso"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
