"use client";

import * as React from "react";
import { Check, Sparkles, Zap, Crown, Rocket, ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { PLANS, type PlanDef } from "@/lib/mock-data";
import { brl } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";

const PLAN_ICONS = { starter: Sparkles, pro: Zap, business: Crown, enterprise: Rocket };

export default function BillingPage() {
  const { push } = useToast();
  const [yearly, setYearly] = React.useState(true);
  const currentPlan = "pro";

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-10">
      <ModuleHeader
        eyebrow="Conta"
        title="Minha Assinatura"
        description="Plano atual: Pro · próximo ciclo em 7 dias. Mude de plano a qualquer momento — cobramos a diferença pro-rata."
      />

      {/* Toggle Mensal/Anual */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setYearly(false)}
          className={cn(
            "px-4 h-9 rounded-md text-sm font-medium transition-colors cursor-pointer",
            !yearly ? "bg-bg-surface text-ink border border-line shadow-elev-1" : "text-ink-muted hover:text-ink"
          )}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setYearly(true)}
          className={cn(
            "px-4 h-9 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2",
            yearly ? "bg-bg-surface text-ink border border-line shadow-elev-1" : "text-ink-muted hover:text-ink"
          )}
        >
          Anual
          <Badge tone="accent" size="xs">−17%</Badge>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => {
          const Icon = PLAN_ICONS[p.id];
          const isCurrent = p.id === currentPlan;
          const monthly = yearly ? p.priceYearlyTotal / 12 : p.priceMonthly;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-lg border p-5 flex flex-col gap-4 relative transition-colors",
                p.popular ? "border-accent/40 bg-bg-surface shadow-elev-2" : "border-line bg-bg-surface hover:border-line-strong"
              )}
            >
              {p.popular && (
                <Badge tone="accent" size="sm" className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-elev-1">
                  Mais popular
                </Badge>
              )}

              <div className="flex items-center gap-2">
                <div className={cn("size-7 rounded-md grid place-items-center", p.popular ? "bg-accent text-ink-inverse" : "bg-bg-elevated text-ink-muted")}>
                  <Icon className="size-3.5" />
                </div>
                <h3 className="text-sm font-semibold text-ink">{p.name}</h3>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="num text-3xl font-semibold text-ink">{brl(monthly).replace(/\D00$/, "")}</span>
                  <span className="text-2xs text-ink-dim">/mês</span>
                </div>
                {yearly && (
                  <p className="text-2xs text-ink-dim mt-1">
                    Cobrado anualmente · {brl(p.priceYearlyTotal)}/ano
                  </p>
                )}
                <p className="text-xs text-ink-muted mt-2 leading-snug">{p.tagline}</p>
              </div>

              <div className="space-y-1.5 py-3 border-y border-line">
                <Limit label="Contas"  value={p.limits.accounts} />
                <Limit label="Regras"  value={p.limits.rules} />
                <Limit label="Usuários" value={p.limits.users} />
              </div>

              <ul className="flex-1 space-y-2 text-xs text-ink-muted">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-3.5 text-positive shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isCurrent ? "secondary" : p.popular ? "primary" : "secondary"}
                size="lg"
                disabled={isCurrent}
                className="w-full"
                onClick={() => push({ tone: "success", title: `Plano ${p.name} selecionado`, description: "Redirecionando para Asaas…" })}
              >
                {isCurrent ? "Plano atual" : "Assinar"}
                {!isCurrent && <ArrowRight />}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-bg-surface p-4 flex items-center gap-3">
          <CreditCard className="size-5 text-ink-muted shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">Pagamento via Asaas</p>
            <p className="text-2xs text-ink-dim mt-0.5">Cartão em até 12x sem juros · PIX com 5% extra de desconto</p>
          </div>
          <Badge tone="info" size="xs">BR</Badge>
        </div>
        <div className="rounded-lg border border-line bg-bg-surface p-4 flex items-center gap-3">
          <ShieldCheck className="size-5 text-positive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">Garantia de 14 dias</p>
            <p className="text-2xs text-ink-dim mt-0.5">Cancele a qualquer momento sem multa</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="space-y-4">
        <div>
          <p className="eyebrow">Dúvidas frequentes</p>
          <h2 className="text-xl font-semibold text-ink mt-1.5">Perguntas comuns sobre planos</h2>
        </div>
        <Accordion type="single" defaultOpen={["faq1"]}>
          <AccordionItem id="faq1" title="Posso mudar de plano depois?">
            Sim. Você pode fazer upgrade ou downgrade a qualquer momento. Se subir de plano, cobramos a diferença{" "}
            <strong className="text-ink">pro-rata</strong> imediatamente. Se descer, o crédito vira saldo para os próximos meses.
          </AccordionItem>
          <AccordionItem id="faq2" title="Como funciona o pagamento anual?">
            No anual você paga 1x por ano com <strong className="text-ink">17% de desconto</strong>. Pode parcelar em até 12x no cartão sem juros via Asaas.
          </AccordionItem>
          <AccordionItem id="faq3" title="Posso cancelar quando quiser?">
            Sim. Sem multa, sem fidelidade. Após cancelar, você mantém acesso até o final do período já pago. No caso do anual, devolvemos proporcionalmente os meses não usados.
          </AccordionItem>
          <AccordionItem id="faq4" title="Tem trial grátis?">
            Sim, <strong className="text-ink">7 dias no plano Pro</strong> sem precisar cadastrar cartão. Após o trial, escolhe um plano ou a conta migra para Free com limites reduzidos.
          </AccordionItem>
          <AccordionItem id="faq5" title="O que acontece se eu ultrapassar o limite de contas?">
            Você é avisado por e-mail e dentro do app. Pode escolher: fazer upgrade de plano, remover contas extras, ou pagar uma taxa por conta extra mensal (calculada pro-rata).
          </AccordionItem>
          <AccordionItem id="faq6" title="Posso emitir nota fiscal?">
            Sim, automaticamente. NFs-e são emitidas pelo Asaas e enviadas ao seu e-mail no momento da cobrança. Suporta CPF e CNPJ.
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-dim">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}
