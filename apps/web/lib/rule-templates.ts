/**
 * Templates de regras prontas — 1 click pra criar regras comuns
 * sem o usuário precisar pensar em todas as opções.
 */

export interface RuleTemplate {
  id: string;
  emoji: string;
  title: string;
  description: string;
  preset: {
    name: string;
    scope: string;
    action: string;
    action_value?: number;
    action_unit?: "pct" | "abs";
    conditions: { metric: string; op: string; value: number }[];
    period: string;
    frequency: string;
  };
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "pause-cpa-high",
    emoji: "🛑",
    title: "Pausar CPA alto",
    description: "Pausa campanha quando o custo por compra ultrapassa um limite. Evita queimar dinheiro com criativo ruim.",
    preset: {
      name: "Pausar CPA acima de R$ 50",
      scope: "Campanhas Ativas",
      action: "pause",
      conditions: [
        { metric: "cost_per_purchase", op: "gt", value: 50 },
      ],
      period: "last_7d",
      frequency: "30min",
    },
  },
  {
    id: "increase-budget-roas",
    emoji: "🚀",
    title: "Escalar campanha vencedora",
    description: "Aumenta o orçamento em 25% quando o ROAS está acima de 3x. Aproveita o que está performando.",
    preset: {
      name: "Aumentar 25% se ROAS > 3",
      scope: "Campanhas Ativas",
      action: "increase_budget",
      action_value: 25,
      action_unit: "pct",
      conditions: [
        { metric: "roas", op: "gt", value: 3 },
      ],
      period: "last_7d",
      frequency: "daily",
    },
  },
  {
    id: "pause-frequency-high",
    emoji: "👁️",
    title: "Pausar criativo cansado",
    description: "Pausa anúncio quando a frequência passa de 4 — sinal claro que o público já viu demais.",
    preset: {
      name: "Pausar frequência > 4",
      scope: "Anúncios Ativos",
      action: "pause",
      conditions: [
        { metric: "frequency", op: "gt", value: 4 },
      ],
      period: "last_7d",
      frequency: "1h",
    },
  },
  {
    id: "pause-spend-cap",
    emoji: "💸",
    title: "Cap diário",
    description: "Pausa campanha que ultrapassou o gasto máximo do dia. Protege contra escala descontrolada.",
    preset: {
      name: "Pausar se gasto hoje > R$ 200",
      scope: "Campanhas Ativas",
      action: "pause",
      conditions: [
        { metric: "spend", op: "gt", value: 200 },
      ],
      period: "today",
      frequency: "30min",
    },
  },
];
