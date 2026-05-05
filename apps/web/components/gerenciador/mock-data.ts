/**
 * Mock data — substituído por chamadas reais à Graph API na Fase 1.4.
 * Mantemos um shape próximo ao que o Meta retorna para minimizar refactor.
 */

export type CampaignStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type Objective =
  | "OUTCOME_SALES"
  | "OUTCOME_LEADS"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_APP_PROMOTION";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  objective: Objective;
  budgetType: "ABO" | "CBO";  // Ad-set Budget Optimization vs Campaign Budget Optimization
  dailyBudget: number; // BRL
  spend: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number; // 0..1
  purchases: number;
  cpa: number;
  revenue: number;
  roas: number;
  impressions: number;
  reach: number;
  leads: number;
  cpl: number;
  cartAdds: number;
  cpCart: number;
  checkouts: number;
  cpCheckout: number;
  whatsapp: number;
  cpWhats: number;
  igVisits: number;
  cpIg: number;
  messages: number;
  cpMessage: number;
}

const NAMES = [
  "Black Friday — Teste 01 Branco",
  "Black Friday — Teste 02 Preto",
  "Always On — Conversão BR",
  "Always On — Lookalike 1%",
  "Lançamento — Topo de Funil",
  "Lançamento — Reengajamento",
  "Curso Premium — Aquecimento",
  "Curso Premium — CPL Frio",
  "Loja XYZ — Catálogo Dinâmico",
  "Loja XYZ — Hot Audience 30d",
  "Curso Lite — WhatsApp Click",
  "Curso Lite — Inscrição Rápida",
  "Lookalike Compradoras — Meta",
  "Brand Awareness — Sudeste",
  "Carrinho Abandonado — 7d",
  "Carrinho Abandonado — 14d",
  "Reels Engajamento — Top BR",
  "Stories Tráfego — Lp Quente",
];

const OBJECTIVES: Objective[] = [
  "OUTCOME_SALES",
  "OUTCOME_LEADS",
  "OUTCOME_AWARENESS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
];

function rand(seed: number) {
  // Pseudo-random determinístico para SSR estável
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateCampaigns(count: number = 18): Campaign[] {
  return Array.from({ length: count }).map((_, i) => {
    const status: CampaignStatus = rand(i + 1) > 0.25 ? "ACTIVE" : rand(i + 13) > 0.5 ? "PAUSED" : "ARCHIVED";
    const dailyBudget = Math.round((50 + rand(i + 7) * 950) / 10) * 10;
    const spend = status === "ACTIVE" ? Math.round(dailyBudget * (3 + rand(i + 11) * 25)) : Math.round(dailyBudget * rand(i + 22) * 4);
    const impressions = Math.round(spend * (200 + rand(i + 33) * 500));
    const clicks = Math.round(impressions * (0.005 + rand(i + 44) * 0.04));
    const ctr = clicks / Math.max(impressions, 1);
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = (spend / Math.max(impressions, 1)) * 1000;
    const purchases = Math.round(clicks * (0.005 + rand(i + 55) * 0.06));
    const avgTicket = 80 + rand(i + 66) * 320;
    const revenue = purchases * avgTicket;
    const roas = spend > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const reach = Math.round(impressions / (1.2 + rand(i + 77) * 1.5));
    const leads = Math.round(purchases * (1.5 + rand(i + 88) * 4));
    const cpl = leads > 0 ? spend / leads : 0;
    const cartAdds = Math.round(purchases * (3 + rand(i + 99) * 8));
    const cpCart = cartAdds > 0 ? spend / cartAdds : 0;
    const checkouts = Math.round(purchases * (1.3 + rand(i + 111) * 1.5));
    const cpCheckout = checkouts > 0 ? spend / checkouts : 0;

    const messages = Math.round(rand(i + 210) * 50);
    return {
      id: `120211000${String(1000000 + i).slice(-7)}`,
      name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ` v${Math.floor(i / NAMES.length) + 1}` : ""),
      status,
      objective: OBJECTIVES[i % OBJECTIVES.length],
      budgetType: rand(i + 99) > 0.4 ? "ABO" : "CBO",
      dailyBudget,
      spend,
      clicks,
      cpc,
      cpm,
      ctr,
      purchases,
      cpa,
      revenue,
      roas,
      impressions,
      reach,
      leads,
      cpl,
      cartAdds,
      cpCart,
      checkouts,
      cpCheckout,
      whatsapp: Math.round(rand(i + 200) * 80),
      cpWhats: 5 + rand(i + 201) * 25,
      igVisits: Math.round(rand(i + 202) * 220),
      cpIg: 1 + rand(i + 203) * 8,
      messages,
      cpMessage: messages > 0 ? spend / messages : 0,
    };
  });
}

export const ACCOUNTS = [
  { id: "act_198765432109876", name: "ROI Brasil — Black Friday", currency: "BRL", balance: 12450 },
  { id: "act_134567890123456", name: "ROI Brasil — Always On",    currency: "BRL", balance: 4200 },
  { id: "act_198765431234567", name: "Loja XYZ — Awareness",      currency: "BRL", balance: 980 },
  { id: "act_876543210987654", name: "Curso Premium — Lançamento", currency: "BRL", balance: 22300 },
  { id: "act_456789012345678", name: "Marca M — Performance",      currency: "BRL", balance: 6700 },
  { id: "act_567890123456789", name: "Marca M — Branding",         currency: "BRL", balance: 3100 },
];
