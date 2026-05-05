"use client";

import * as React from "react";
import {
  Copy,
  Share2,
  MousePointerClick,
  UserPlus,
  TrendingUp,
  Activity,
  Wallet,
  Banknote,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { useToast } from "@/components/ui/toast";
import { AFFILIATE_KPIS, AFFILIATE_CLICKS_30D, AFFILIATE_PROHIBITED } from "@/lib/mock-data";
import { brl, num, pct } from "@/lib/format";

const REFERRAL_URL = "https://app.admanager.com.br/ref/VINNYK";

export default function AfiliadoPage() {
  const { push } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(REFERRAL_URL);
    push({ tone: "success", title: "Link copiado", description: "Cole onde fizer sentido pro seu público." });
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-10">
      <ModuleHeader
        eyebrow="Conta"
        title="Indique e Ganhe"
        description="Ganhe 20% recorrente sobre cada assinatura ativa de quem você indicar. Liberação 30 dias após o primeiro pagamento. Saque mínimo R$ 50 via PIX."
        actions={
          <Button variant="primary" onClick={copy}>
            <Share2 /> Compartilhar link
          </Button>
        }
      />

      {/* Referral link */}
      <section className="rounded-lg border border-line bg-bg-surface p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-2">Seu link de afiliado</p>
            <div className="flex items-center gap-2 rounded-md bg-bg-inset border border-line px-3 py-2 font-mono text-sm">
              <span className="text-ink-muted text-xs">https://</span>
              <span className="text-ink truncate">app.admanager.com.br/ref/</span>
              <span className="text-accent font-semibold">VINNYK</span>
              <button
                onClick={copy}
                className="ml-auto size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-accent hover:bg-bg-elevated transition-colors cursor-pointer shrink-0"
                aria-label="Copiar link"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
            <p className="text-2xs text-ink-dim mt-2">
              Cookie de 30 dias · comissão recorrente enquanto a assinatura estiver ativa.
            </p>
          </div>
        </div>
      </section>

      {/* 6 KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="Cliques (30d)"          value={num(AFFILIATE_KPIS.clicks)}             icon={MousePointerClick} tone="info" />
        <Kpi label="Cadastros"               value={num(AFFILIATE_KPIS.signups)}            icon={UserPlus}          tone="info" />
        <Kpi label="Taxa de conversão"       value={pct(AFFILIATE_KPIS.conversionRate)}     icon={TrendingUp}        tone="positive" />
        <Kpi label="Assinaturas ativas"      value={num(AFFILIATE_KPIS.activeSubscriptions)} icon={Activity}          tone="positive" />
        <Kpi label="Saldo a receber"          value={brl(AFFILIATE_KPIS.pendingBalance)}     icon={Wallet}            tone="warning"  hint={`Próximo: ${brl(AFFILIATE_KPIS.next30dProjection)} em 30d`} />
        <Kpi label="Disponível para saque"   value={brl(AFFILIATE_KPIS.availableBalance)}   icon={Banknote}          tone="accent"   hint="PIX BR · mínimo R$ 50" />
      </section>

      {/* Mini chart 30d */}
      <section className="rounded-lg border border-line bg-bg-surface p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="eyebrow">Cliques nos últimos 30 dias</p>
            <h3 className="text-md font-semibold text-ink mt-1">{num(AFFILIATE_KPIS.clicks)} cliques · média {Math.round(AFFILIATE_KPIS.clicks / 30)}/dia</h3>
          </div>
          <Badge tone="positive" size="sm">+18% vs mês anterior</Badge>
        </div>
        <ClicksChart data={AFFILIATE_CLICKS_30D} />
      </section>

      {/* Sacar */}
      <section className="rounded-lg border border-accent/30 bg-accent-subtle/20 p-5 flex items-center gap-4">
        <div className="size-10 rounded-md bg-accent text-ink-inverse grid place-items-center shrink-0">
          <Banknote className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Disponível para saque: <span className="text-accent num">{brl(AFFILIATE_KPIS.availableBalance)}</span></p>
          <p className="text-2xs text-ink-muted mt-0.5">Saque via PIX em até 1 dia útil. Valor mínimo R$ 50,00.</p>
        </div>
        <Button variant="primary">Solicitar saque</Button>
      </section>

      {/* Práticas proibidas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-negative" />
          <h2 className="text-sm font-semibold text-ink">Práticas proibidas (banimento imediato)</h2>
        </div>
        <Accordion type="multiple" defaultOpen={[]}>
          {AFFILIATE_PROHIBITED.map((p, i) => (
            <AccordionItem
              key={i}
              id={`pp${i}`}
              title={<span className="text-negative font-medium">{p.title}</span>}
              badge={<Badge tone="negative" size="xs">Proibido</Badge>}
            >
              {p.body}
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-2xs text-ink-dim leading-relaxed">
          Lemos cada caso individualmente. Em caso de dúvida sobre uma estratégia, abra um ticket antes de investir tempo —{" "}
          <a href="#" className="text-accent hover:underline font-medium">contato@admanager.com.br</a>{" "}
          <ExternalLink className="size-3 inline -mt-0.5" />
        </p>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "info" | "positive" | "warning" | "accent";
  hint?: string;
}) {
  const cls = {
    info: "text-info bg-info-subtle",
    positive: "text-positive bg-positive-subtle",
    warning: "text-warning bg-warning-subtle",
    accent: "text-accent bg-accent-subtle",
  }[tone];
  return (
    <div className="rounded-lg border border-line bg-bg-surface p-4">
      <div className="flex items-start justify-between">
        <span className="text-2xs uppercase tracking-wider font-medium text-ink-dim">{label}</span>
        <div className={`size-7 rounded-md grid place-items-center ${cls}`}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="num text-2xl font-semibold text-ink mt-3">{value}</div>
      {hint && <div className="text-2xs text-ink-dim mt-1.5">{hint}</div>}
    </div>
  );
}

function ClicksChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((v, i) => {
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className="flex-1 rounded-t transition-colors hover:bg-accent"
            style={{
              height: `${(v / max) * 100}%`,
              backgroundColor: isLast ? "hsl(var(--accent))" : "hsl(var(--ink-dim) / 0.3)",
            }}
            title={`Dia ${i + 1}: ${v} cliques`}
          />
        );
      })}
    </div>
  );
}
