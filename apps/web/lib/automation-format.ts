/**
 * Helpers de formatação em linguagem natural pra Regras e Alertas.
 * Pega config crua do DB e gera frase legível pro usuário ver no card.
 */

import type { Rule, Alert } from "./hooks/use-automation";

const METRIC_LABELS: Record<string, string> = {
  spend: "gasto",
  cost_per_result: "custo por resultado",
  cost_per_lead: "custo por lead",
  cost_per_purchase: "custo por compra",
  cost_per_message: "custo por mensagem",
  cpa: "CPA",
  cpc: "CPC",
  cpm: "CPM",
  cpl: "CPL",
  cpv: "CPV",
  ctr: "CTR",
  roi: "ROI",
  roas: "ROAS",
  profit: "lucro",
  margin: "margem de lucro",
  budget: "orçamento",
  cpi: "CPI",
  sales: "vendas",
  utm_purchases: "compras UTM",
  leads: "leads",
  messages: "mensagens",
  ics: "ICs (iniciar conversa)",
  conversations: "conversas",
  cost_per_conversation: "custo por conversa",
  clicks: "cliques",
  page_views: "visualizações de página",
  frequency: "frequência",
};

const OP_LABELS_RULE: Record<string, string> = {
  gt: "maior que",
  lt: "menor que",
  gte: "maior ou igual a",
  lte: "menor ou igual a",
};

const OP_LABELS_ALERT: Record<string, string> = {
  gt: "passar de",
  lt: "ficar abaixo de",
  gte: "atingir",
  lte: "cair até",
  eq: "for igual a",
};

const PERIOD_LABELS: Record<string, string> = {
  today: "hoje",
  yesterday: "ontem",
  last_3d: "nos últimos 3 dias",
  last_7d_inc: "nos últimos 7 dias (incluindo hoje)",
  last_7d_exc: "nos últimos 7 dias (sem hoje)",
  last_7d: "nos últimos 7 dias",
  last_14d: "nos últimos 14 dias",
  last_30d: "nos últimos 30 dias",
};

const FREQUENCY_LABELS: Record<string, string> = {
  "10min": "a cada 10 minutos",
  "15min": "a cada 15 minutos",
  "30min": "a cada 30 minutos",
  "1h": "a cada 1 hora",
  "2h": "a cada 2 horas",
  "3h": "a cada 3 horas",
  "6h": "a cada 6 horas",
  daily: "uma vez por dia",
};

const ACTION_LABELS: Record<string, string> = {
  pause: "Pausa",
  activate: "Ativa",
  increase_budget: "Aumenta orçamento",
  decrease_budget: "Diminui orçamento",
  set_budget: "Define orçamento fixo",
};

export function formatMetric(metric: string): string {
  return METRIC_LABELS[metric] ?? metric;
}

export function formatRuleAction(rule: Rule): string {
  const base = ACTION_LABELS[rule.action] ?? rule.action;
  if (rule.action_value != null && rule.action !== "pause" && rule.action !== "activate") {
    const unit = rule.action_unit === "pct" ? "%" : "R$";
    return `${base} em ${rule.action_unit === "pct" ? "" : "R$ "}${rule.action_value}${rule.action_unit === "pct" ? "%" : ""}`;
  }
  return base;
}

export function formatRuleConditions(rule: Rule): string {
  if (!rule.conditions || rule.conditions.length === 0) return "";
  const parts = rule.conditions.map((c) => {
    const metric = formatMetric(c.metric);
    const op = OP_LABELS_RULE[c.op] ?? c.op;
    return `${metric} ${op} ${c.value}`;
  });
  if (parts.length === 1) return parts[0];
  return parts.join(" e ");
}

export function formatRuleNatural(rule: Rule): string {
  const action = formatRuleAction(rule);
  const conditions = formatRuleConditions(rule);
  const scope = rule.scope.toLowerCase();
  const period = PERIOD_LABELS[rule.period] ?? "";
  const freq = FREQUENCY_LABELS[rule.frequency] ?? "";

  // Constrói: "Pausa campanhas ativas quando CPA > R$ 50 nos últimos 7 dias. Verifica a cada 30min."
  const sentence = `${action} ${scope} quando ${conditions}${period ? " " + period : ""}.`;
  const cadence = freq ? ` Verifica ${freq}.` : "";
  return sentence + cadence;
}

export function formatAlertNatural(alert: Alert, accountName?: string): string {
  const metric = formatMetric(alert.metric);
  const op = OP_LABELS_ALERT[alert.op] ?? alert.op;
  const target = accountName ?? (alert.account_filter === "all" ? "qualquer conta" : alert.account_filter);
  return `Avisa quando ${metric} ${op} ${alert.value} em ${target}.`;
}
