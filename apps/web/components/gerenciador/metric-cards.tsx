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
  Info,
} from "lucide-react";
import { pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Metric {
  label: string;
  value: string;
  delta?: number;
  /** true = subir é bom (verde); false = subir é ruim (vermelho); undefined = neutro (cinza) */
  goodIsUp?: boolean;
  /** Texto da janela com que estamos comparando, ex: "25 abr → 01 mai" */
  comparedWith?: string | null;
  spark?: number[];
  tooltip?: string;
}

// Tooltip default por label — explica fonte/cálculo de cada métrica
const METRIC_TOOLTIPS: Record<string, string> = {
  "Investido": "Quanto a Meta cobrou do seu cartão no período. Vem direto da Graph API.",
  "Investimento": "Quanto a Meta cobrou do seu cartão no período. Vem direto da Graph API.",
  "Orçamento": "Soma dos orçamentos diários ativos das campanhas (CBO) ou conjuntos (ABO).",
  "Receita Pixel": "Valor de conversões em compras reportado pelo Pixel/CAPI da Meta. Pode estar inflado por duplicação ou subreportado pós-iOS 14.",
  "Receita UTM": "Receita real vinda dos webhooks dos seus gateways (Hotmart, Kiwify, Hubla, Assiny). Source of truth pra ROAS verdadeiro.",
  "ROAS Pixel": "Receita Pixel ÷ Investido. Pode divergir muito do ROAS real porque o Pixel não pega todas as vendas.",
  "ROAS UTM": "Receita UTM ÷ Investido. Mais confiável — só conta vendas que de fato chegaram nos gateways.",
  "Compras": "Total de eventos 'omni_purchase' (deduplicado web+app+offline) reportados pela Meta no período.",
  "Custo/Compra": "Investido ÷ Compras (ambos do Pixel). Use ROAS UTM se quer custo real.",
  "CTR": "Cliques ÷ Impressões. Mede atratividade do criativo.",
  "CPC": "Investido ÷ Cliques.",
  "CPM": "Custo a cada 1000 impressões.",
  "Cliques": "Cliques no link do anúncio (não inclui curtidas/reactions).",
  "Impressões": "Vezes que o anúncio foi exibido. Uma pessoa pode ver várias vezes.",
  "Alcance": "Pessoas únicas que viram o anúncio no período.",
  "Frequência": "Impressões ÷ Alcance. Acima de 4 = saturação, considere trocar criativo.",
  "Visitas IG": "Cliques que levaram à página do perfil do Instagram.",
  "Custo/Visita IG": "Investido ÷ Visitas IG.",
  "Mensagens": "Conversas iniciadas via WhatsApp/Messenger.",
  "Custo/Mensagem": "Investido ÷ Mensagens iniciadas.",
  "Leads": "Eventos 'lead' reportados pelo Pixel.",
  "Custo/Lead": "Investido ÷ Leads.",
  "Carrinhos": "Adições ao carrinho.",
  "Custo/Carrinho": "Investido ÷ Adições ao carrinho.",
  "Checkouts": "Iniciações de checkout.",
  "Custo/Checkout": "Investido ÷ Checkouts iniciados.",
};

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

export function MetricCards({ metrics, loading }: { metrics: Metric[]; loading?: boolean }) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} {...m} loading={loading} />
        ))}
      </div>
    </TooltipProvider>
  );
}

function Card({ label, value, delta, goodIsUp, comparedWith, spark, tooltip, loading }: Metric & { loading?: boolean }) {
  const wentUp = (delta ?? 0) >= 0;
  // Cor semântica: subiu + bom = verde, subiu + ruim = vermelho, etc.
  // goodIsUp undefined = neutro (cinza)
  const isGood = goodIsUp === undefined ? null : (wentUp === goodIsUp);
  const theme = METRIC_THEME[label] ?? DEFAULT_THEME;
  const Icon = theme.icon;
  const tipText = tooltip ?? METRIC_TOOLTIPS[label];

  return (
    <div className="rounded-xl border border-line bg-bg-surface p-4 hover:border-line-strong hover:shadow-elev-1 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-2xs uppercase tracking-wider font-semibold text-ink-dim leading-none whitespace-nowrap inline-flex items-center gap-1">
            {label}
            {tipText && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Sobre ${label}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-dim hover:text-accent cursor-help"
                  >
                    <Info className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-2xs leading-relaxed">{tipText}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </span>
          {loading ? (
            <div className="mt-2.5 h-7 w-20 rounded bg-bg-elevated animate-pulse" />
          ) : (
            <div className="num text-xl text-ink font-bold mt-2.5 leading-tight tracking-tight">{value}</div>
          )}
          {delta != null && !loading && (
            <span
              className={cn(
                "mt-1.5 text-2xs font-mono inline-flex items-center gap-0.5 font-medium",
                isGood === true ? "text-positive" :
                isGood === false ? "text-negative" :
                "text-ink-dim"
              )}
              title={comparedWith ? `vs ${comparedWith}` : "vs período anterior"}
            >
              {wentUp ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
              {pct(Math.abs(delta))}
              {comparedWith && (
                <span className="text-ink-dim ml-1 font-normal">vs {comparedWith}</span>
              )}
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
