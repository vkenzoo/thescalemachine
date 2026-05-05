"use client";

import * as React from "react";
import {
  ArrowUp,
  ArrowDown,
  DollarSign,
  Target,
  Layers,
  Instagram,
  MessageCircle,
  ShoppingCart,
  TrendingUp,
  MousePointerClick,
  Eye,
  Users,
  Percent,
  Receipt,
} from "lucide-react";
import { pct } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Metric {
  label: string;
  value: string;
  delta?: number;
  spark?: number[];
}

// Mapa de ícone + cor por tipo de métrica (matchea screenshots do produto)
const METRIC_THEME: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  "Investido":      { icon: DollarSign,        color: "text-warning", bg: "bg-warning-subtle" },
  "Investimento":   { icon: DollarSign,        color: "text-warning", bg: "bg-warning-subtle" },
  "Receita":        { icon: ShoppingCart,      color: "text-positive", bg: "bg-positive-subtle" },
  "ROAS":           { icon: TrendingUp,        color: "text-positive", bg: "bg-positive-subtle" },
  "Compras":        { icon: ShoppingCart,      color: "text-accent",  bg: "bg-accent-subtle" },
  "Custo/Compra":   { icon: Receipt,           color: "text-accent",  bg: "bg-accent-subtle" },
  "CTR":            { icon: Target,            color: "text-negative", bg: "bg-negative-subtle" },
  "CPC":            { icon: Layers,            color: "text-info",    bg: "bg-info-subtle" },
  "CPM":            { icon: Layers,            color: "text-info",    bg: "bg-info-subtle" },
  "Cliques":        { icon: MousePointerClick, color: "text-info",    bg: "bg-info-subtle" },
  "Impressões":     { icon: Eye,               color: "text-ink-muted", bg: "bg-bg-elevated" },
  "Alcance":        { icon: Users,             color: "text-ink-muted", bg: "bg-bg-elevated" },
  "Visitas Perfil IG": { icon: Instagram,      color: "text-[#E1306C]", bg: "bg-[#E1306C]/10" },
  "Visitas IG":        { icon: Instagram,      color: "text-[#E1306C]", bg: "bg-[#E1306C]/10" },
  "Custo por Visita IG": { icon: Instagram,    color: "text-[#E1306C]", bg: "bg-[#E1306C]/10" },
  "Mensagens":      { icon: MessageCircle,     color: "text-positive", bg: "bg-positive-subtle" },
  "Custo/Mensagem": { icon: MessageCircle,     color: "text-positive", bg: "bg-positive-subtle" },
  "Frequência":     { icon: Percent,           color: "text-warning", bg: "bg-warning-subtle" },
};

const DEFAULT_THEME = { icon: TrendingUp, color: "text-ink-muted", bg: "bg-bg-elevated" };

export function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((m) => (
        <Card key={m.label} {...m} />
      ))}
    </div>
  );
}

function Card({ label, value, delta, spark }: Metric) {
  const positive = (delta ?? 0) >= 0;
  const theme = METRIC_THEME[label] ?? DEFAULT_THEME;
  const Icon = theme.icon;

  return (
    <div className="rounded-xl border border-line bg-bg-surface p-4 hover:border-line-strong hover:shadow-elev-1 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-2xs uppercase tracking-wider font-semibold text-ink-dim leading-none whitespace-nowrap">
            {label}
          </span>
          <div className="num text-xl text-ink font-bold mt-2.5 leading-tight tracking-tight">{value}</div>
          {delta != null && (
            <span
              className={cn(
                "mt-1.5 text-2xs font-mono inline-flex items-center gap-0.5 font-medium",
                positive ? "text-positive" : "text-negative"
              )}
            >
              {positive ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
              {pct(Math.abs(delta))}
            </span>
          )}
        </div>
        {/* Ícone grande colorido à direita */}
        <div className={cn("size-10 rounded-lg grid place-items-center shrink-0", theme.bg)}>
          <Icon className={cn("size-5", theme.color)} />
        </div>
      </div>
      {spark && (
        <div className="mt-2.5 flex items-end gap-px h-3">
          {spark.map((v, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm bg-line group-hover:bg-line-strong transition-colors",
                i === spark.length - 1 && (positive ? "bg-positive/40 group-hover:bg-positive/60" : "bg-negative/40 group-hover:bg-negative/60")
              )}
              style={{ height: `${Math.max(8, v * 100)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
