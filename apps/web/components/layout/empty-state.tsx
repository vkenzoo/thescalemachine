import * as React from "react";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Empty state genérico — ícone temático grande + título + descrição + CTA opcional.
 * Inspirado no padrão do produto original ("Nenhuma regra criada", "Nenhum relatório criado").
 */
export function EmptyState({ icon: Icon, title, description, action, className, size = "md" }: Props) {
  const sizes = {
    sm: { wrap: "py-10", icon: "size-10", title: "text-sm", desc: "text-xs" },
    md: { wrap: "py-20", icon: "size-12", title: "text-md", desc: "text-sm" },
    lg: { wrap: "py-32", icon: "size-14", title: "text-lg", desc: "text-md" },
  }[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6", sizes.wrap, className)}>
      <div className="relative mb-5">
        {/* Halo sutil ao redor do ícone */}
        <div className="absolute inset-0 -m-3 rounded-full bg-bg-elevated/50 blur-xl" />
        <div className={cn(
          "relative rounded-xl bg-bg-elevated border border-line grid place-items-center",
          size === "sm" ? "size-14" : size === "md" ? "size-20" : "size-24"
        )}>
          <Icon className={cn(sizes.icon, "text-ink-dim")} strokeWidth={1.5} />
        </div>
      </div>
      <h3 className={cn("font-medium text-ink", sizes.title)}>{title}</h3>
      {description && (
        <p className={cn("mt-1.5 text-ink-dim max-w-sm leading-relaxed pretty", sizes.desc)}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
