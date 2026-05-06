/**
 * Catálogos centrais de strings + datasets reutilizáveis.
 * Tudo aqui sai daqui quando o backend chegar — vira query.
 */

// ============================================================
// MÉTRICAS — Gerenciador (até 12 selecionáveis no Resumo do Período)
// ============================================================
export interface MetricDef {
  id: string;
  label: string;
  category: "core" | "conversion" | "engagement" | "messaging" | "instagram";
  format: "currency" | "number" | "percent" | "ratio";
  /** Direção que aumenta = bom (true) ou ruim (false). Usado para colorir delta. */
  goodIsUp?: boolean;
}

export const METRICS: MetricDef[] = [
  // Core
  { id: "spend",       label: "Investimento",       category: "core", format: "currency" },
  { id: "budget",      label: "Orçamento",          category: "core", format: "currency" },
  { id: "impressions", label: "Impressões",         category: "core", format: "number", goodIsUp: true },
  { id: "reach",       label: "Alcance",            category: "core", format: "number", goodIsUp: true },
  { id: "frequency",   label: "Frequência",         category: "core", format: "ratio" },
  { id: "clicks",      label: "Cliques",            category: "core", format: "number", goodIsUp: true },
  { id: "ctr",         label: "CTR",                category: "core", format: "percent", goodIsUp: true },
  { id: "cpc",         label: "CPC",                category: "core", format: "currency", goodIsUp: false },
  { id: "cpm",         label: "CPM",                category: "core", format: "currency", goodIsUp: false },
  // Conversion
  { id: "purchases",   label: "Compras",            category: "conversion", format: "number", goodIsUp: true },
  { id: "cpa",         label: "Custo por Compra",   category: "conversion", format: "currency", goodIsUp: false },
  { id: "revenue",     label: "Receita (Pixel/CAPI)", category: "conversion", format: "currency", goodIsUp: true },
  { id: "utm_revenue", label: "Receita Real (UTM)",  category: "conversion", format: "currency", goodIsUp: true },
  { id: "roas",        label: "ROAS (Pixel)",        category: "conversion", format: "ratio", goodIsUp: true },
  { id: "utm_roas",    label: "ROAS Real (UTM)",     category: "conversion", format: "ratio", goodIsUp: true },
  { id: "roi",         label: "ROI",                category: "conversion", format: "percent", goodIsUp: true },
  { id: "leads",       label: "Leads",              category: "conversion", format: "number", goodIsUp: true },
  { id: "cpl",         label: "Custo por Lead",     category: "conversion", format: "currency", goodIsUp: false },
  { id: "cart_adds",   label: "Adições ao Carrinho", category: "conversion", format: "number", goodIsUp: true },
  { id: "cp_cart",     label: "Custo por Carrinho", category: "conversion", format: "currency", goodIsUp: false },
  { id: "checkouts",   label: "Finalizações de Compra", category: "conversion", format: "number", goodIsUp: true },
  { id: "cp_checkout", label: "Custo por Finalização",  category: "conversion", format: "currency", goodIsUp: false },
  // Messaging
  { id: "messages",    label: "Mensagens Recebidas", category: "messaging", format: "number", goodIsUp: true },
  { id: "cp_message",  label: "Custo por Mensagem",  category: "messaging", format: "currency", goodIsUp: false },
  { id: "ics",         label: "Iniciar Conversa",    category: "messaging", format: "number", goodIsUp: true },
  { id: "cp_ic",       label: "Custo por IC",        category: "messaging", format: "currency", goodIsUp: false },
  // Instagram
  { id: "ig_visits",   label: "Visitas IG",          category: "instagram", format: "number", goodIsUp: true },
  { id: "cp_ig_visit", label: "Custo por Visita IG", category: "instagram", format: "currency", goodIsUp: false },
];

export const METRIC_CATEGORY_LABELS: Record<string, string> = {
  core: "Métricas principais",
  conversion: "Conversão e funil",
  engagement: "Engajamento",
  messaging: "Mensagens e WhatsApp",
  instagram: "Instagram",
  custom: "Personalizadas (suas)",
};

// ============================================================
// REGRAS — 28 métricas para condições
// ============================================================
export const RULE_METRICS = [
  "Gasto",
  "Custo por Resultado",
  "Custo por Lead",
  "Custo por Compra",
  "Custo por Mensagem (WhatsApp)",
  "CPA (todas conversões)",
  "ROI",
  "ROAS",
  "Lucro",
  "Margem de Lucro",
  "CPC",
  "Orçamento",
  "CPI",
  "Vendas",
  "Compras UTMs",
  "Leads",
  "Mensagens (WhatsApp)",
  "ICs (Iniciar Conversa)",
  "CTR",
  "CPM",
  "Cliques",
  "Conversas",
  "Custo por Conversa",
  "CPL",
  "CPV",
  "Visualizações de Página",
  "Frequência",
  "Alcance",
] as const;

export const RULE_OPERATORS = [
  { id: "gt",  label: "Maior que (>)" },
  { id: "lt",  label: "Menor que (<)" },
  { id: "gte", label: "Maior ou igual a (≥)" },
  { id: "lte", label: "Menor ou igual a (≤)" },
] as const;

export const RULE_PERIODS = [
  "Hoje",
  "Ontem",
  "Últimos 3 dias",
  "Últimos 7 dias incluindo hoje",
  "Últimos 7 dias excluindo hoje",
  "Últimos 14 dias",
  "Últimos 30 dias",
] as const;

export const RULE_FREQUENCIES = [
  "A cada 10 minutos",
  "A cada 15 minutos",
  "A cada 30 minutos",
  "A cada 1 hora",
  "A cada 2 horas",
  "A cada 3 horas",
  "A cada 6 horas",
  "Uma vez por dia",
] as const;

export const RULE_SCOPES = [
  "Campanhas Ativas",
  "Campanhas Pausadas",
  "Conjuntos Ativos",
  "Conjuntos Pausados",
  "Anúncios Ativos",
  "Anúncios Pausados",
] as const;

export const RULE_NAME_FILTERS = ["Qualquer", "Contém", "Não contém", "Começa com"] as const;

export const RULE_ACTIONS = [
  { id: "pause",      label: "Pausar" },
  { id: "activate",   label: "Ativar" },
  { id: "increase",   label: "Aumentar Orçamento", needsValue: true },
  { id: "decrease",   label: "Diminuir Orçamento", needsValue: true },
  { id: "set_budget", label: "Definir Orçamento Fixo", needsValue: true },
] as const;

export const RULE_SCHEDULES = ["Continuamente", "Data Específica", "Personalizado"] as const;

// ============================================================
// ALERTAS
// ============================================================
export const ALERT_METRICS = [
  { id: "cpa",   label: "CPA (Custo por Aquisição)" },
  { id: "cpc",   label: "CPC (Custo por Clique)" },
  { id: "cpm",   label: "CPM (Custo por Mil)" },
  { id: "ctr",   label: "CTR (Taxa de Clique %)" },
  { id: "spend", label: "Gasto Diário (R$)" },
  { id: "roas",  label: "ROAS (Retorno sobre Gasto)" },
] as const;

export const ALERT_OPS = [
  { id: "gt", label: "Maior que (>)" },
  { id: "lt", label: "Menor que (<)" },
  { id: "eq", label: "Igual a (=)" },
] as const;

// ============================================================
// PLATAFORMAS UTM
// ============================================================
export interface PlatformDef {
  id: string;
  name: string;
  color: string;     // hex
  description: string;
}

export const UTM_PLATFORMS: PlatformDef[] = [
  { id: "hotmart", name: "Hotmart", color: "#F04E23", description: "Marketplace de infoprodutos do Brasil" },
  { id: "kiwify",  name: "Kiwify",  color: "#0EAD69", description: "Plataforma de cursos online e checkout" },
  { id: "hubla",   name: "Hubla",   color: "#111111", description: "Comunidades pagas e infoprodutos" },
  { id: "assiny",  name: "Assiny",  color: "#7C3AED", description: "Checkout e funil pra infoprodutos" },
];

// ============================================================
// PLANOS
// ============================================================
export interface PlanDef {
  id: "starter" | "pro" | "business" | "enterprise";
  name: string;
  priceMonthly: number;     // BRL
  priceYearlyTotal: number; // BRL (já com desconto 17%)
  popular?: boolean;
  tagline: string;
  features: string[];
  limits: { accounts: string; rules: string; users: string };
}

export const PLANS: PlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 97,
    priceYearlyTotal: 970, // 12 × 97 × 0.83
    tagline: "Para gestores começando",
    limits: { accounts: "3 contas", rules: "—", users: "1 usuário" },
    features: [
      "Gerenciador Meta Ads completo",
      "Editor de anúncios em massa",
      "Relatórios básicos",
      "Suporte por e-mail",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 197,
    priceYearlyTotal: 1962,
    popular: true,
    tagline: "Para freelancers e agências pequenas",
    limits: { accounts: "10 contas", rules: "10 regras", users: "3 usuários" },
    features: [
      "Tudo do Starter",
      "Relatórios compartilháveis white-label",
      "Criar Públicos",
      "Regras Automatizadas (até 10)",
      "Integrações UTMs (Hotmart, Kiwify, Eduzz, Guru)",
      "Central de contas",
      "Suporte por chat",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 397,
    priceYearlyTotal: 3956,
    tagline: "Para agências de performance",
    limits: { accounts: "30 contas", rules: "Ilimitadas", users: "Ilimitados" },
    features: [
      "Tudo do Pro",
      "Regras ilimitadas",
      "Escala de Orçamento automática com IA",
      "Escala Horizontal (duplicação automática)",
      "Criação automática de públicos",
      "Modo Conta Inteira (piloto automático)",
      "Pausar anúncios automaticamente",
      "Cap semanal/mensal com pacing",
      "Suporte prioritário",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 797,
    priceYearlyTotal: 7944,
    tagline: "Para holdings e grandes operações",
    limits: { accounts: "Ilimitadas", rules: "Ilimitadas", users: "Ilimitados" },
    features: [
      "Tudo do Business",
      "API Access",
      "Onboarding dedicado",
      "SLA de suporte",
      "Customizações sob demanda",
    ],
  },
];

// ============================================================
// MOCK DE REGRAS / ALERTAS (poucos itens pra demonstrar não-vazio)
// ============================================================
export interface RuleSummary {
  id: string;
  name: string;
  status: "active" | "paused";
  scope: string;
  action: string;
  conditions: number;
  frequency: string;
  lastRun?: string;
  triggered: number;
}

export const MOCK_RULES: RuleSummary[] = [
  {
    id: "r1",
    name: "Pausar quando CPA > R$ 50 nos últimos 3 dias",
    status: "active",
    scope: "Campanhas Ativas (todas as contas)",
    action: "Pausar",
    conditions: 1,
    frequency: "A cada 1 hora",
    lastRun: "há 23min",
    triggered: 12,
  },
  {
    id: "r2",
    name: "Aumentar orçamento +25% quando ROAS > 3× ontem",
    status: "active",
    scope: "Campanhas Ativas (ROI Brasil)",
    action: "Aumentar Orçamento (+25%)",
    conditions: 2,
    frequency: "Uma vez por dia",
    lastRun: "hoje, 06:00",
    triggered: 4,
  },
  {
    id: "r3",
    name: "Pausar criativos com frequência > 4",
    status: "paused",
    scope: "Anúncios Ativos (Loja XYZ)",
    action: "Pausar",
    conditions: 1,
    frequency: "A cada 6 horas",
    triggered: 0,
  },
];

export interface AlertSummary {
  id: string;
  metric: string;
  op: string;
  value: number;
  account: string;
  triggers: number;
  lastTriggered?: string;
  enabled: boolean;
}

export const MOCK_ALERTS: AlertSummary[] = [
  { id: "a1", metric: "CPA",  op: ">",  value: 75,    account: "ROI Brasil — Black Friday", triggers: 8, lastTriggered: "há 1h", enabled: true },
  { id: "a2", metric: "ROAS", op: "<",  value: 1.5,   account: "Todas as contas",            triggers: 3, lastTriggered: "ontem", enabled: true },
  { id: "a3", metric: "CTR",  op: "<",  value: 0.008, account: "Loja XYZ — Awareness",       triggers: 0, enabled: false },
];

// ============================================================
// CONTAS — versão expandida pra Saldo + Central
// ============================================================
export interface AccountFull {
  id: string;
  name: string;
  platform: "meta";
  currency: string;
  status: "active" | "disabled";
  balanceCents: number;
  spentTodayCents: number;
  avgDailySpendCents: number;
  activeCampaigns: number;
  type: "Pré-pago" | "Cartão" | "Faturamento";
  groupId?: string;
}

export const ACCOUNT_GROUPS = [
  { id: "all",        name: "Todas as contas",   color: "#FF5C33" },
  { id: "negocios",   name: "Negócios Locais",   color: "#3B82F6" },
  { id: "info",       name: "Infoproduto",       color: "#A855F7" },
  { id: "ecom",       name: "E-commerce",        color: "#22C55E" },
  { id: "anderson",   name: "Anderson",          color: "#F59E0B" },
];

export const ACCOUNTS_FULL: AccountFull[] = [
  { id: "act_198765432109876", name: "ROI Brasil — Black Friday",  platform: "meta", currency: "BRL", status: "active",   balanceCents: 1_245_000, spentTodayCents: 187_400, avgDailySpendCents: 312_000, activeCampaigns: 8, type: "Pré-pago", groupId: "info" },
  { id: "act_134567890123456", name: "ROI Brasil — Always On",     platform: "meta", currency: "BRL", status: "active",   balanceCents:   420_000, spentTodayCents:  62_300, avgDailySpendCents:  98_500, activeCampaigns: 4, type: "Cartão",  groupId: "info" },
  { id: "act_198765431234567", name: "Loja XYZ — Awareness",       platform: "meta", currency: "BRL", status: "active",   balanceCents:    98_000, spentTodayCents:  41_200, avgDailySpendCents:  45_000, activeCampaigns: 3, type: "Pré-pago", groupId: "ecom" },
  { id: "act_876543210987654", name: "Curso Premium — Lançamento", platform: "meta", currency: "BRL", status: "active",   balanceCents: 2_230_000, spentTodayCents: 412_700, avgDailySpendCents: 510_000, activeCampaigns: 12, type: "Cartão", groupId: "info" },
  { id: "act_456789012345678", name: "Marca M — Performance",      platform: "meta", currency: "BRL", status: "active",   balanceCents:   670_000, spentTodayCents:  83_200, avgDailySpendCents: 120_000, activeCampaigns: 6, type: "Faturamento", groupId: "ecom" },
  { id: "act_567890123456789", name: "Marca M — Branding",         platform: "meta", currency: "BRL", status: "active",   balanceCents:   310_000, spentTodayCents:  18_400, avgDailySpendCents:  35_000, activeCampaigns: 2, type: "Cartão", groupId: "ecom" },
  { id: "act_345678901234567", name: "Pizzaria do João",           platform: "meta", currency: "BRL", status: "active",   balanceCents:    23_000, spentTodayCents:   8_900, avgDailySpendCents:  12_500, activeCampaigns: 1, type: "Cartão", groupId: "negocios" },
  { id: "act_987654321098765", name: "Cliente A — Teste",          platform: "meta", currency: "BRL", status: "disabled", balanceCents:         0, spentTodayCents:      0, avgDailySpendCents:      0, activeCampaigns: 0, type: "Cartão" },
  { id: "act_111222333444555", name: "Anderson — Black",           platform: "meta", currency: "BRL", status: "active",   balanceCents:   840_000, spentTodayCents: 156_300, avgDailySpendCents: 220_000, activeCampaigns: 5, type: "Pré-pago", groupId: "anderson" },
];

// Helper de saúde de saldo
export type Health = "critical" | "low" | "healthy" | "inactive";

export function balanceHealth(acc: AccountFull): { health: Health; daysLeft: number | null } {
  if (acc.avgDailySpendCents === 0) return { health: "inactive", daysLeft: null };
  const days = acc.balanceCents / acc.avgDailySpendCents;
  if (acc.status === "disabled" || days < 3) return { health: "critical", daysLeft: days };
  if (days < 7) return { health: "low", daysLeft: days };
  return { health: "healthy", daysLeft: days };
}

// ============================================================
// REPORTS / TUTORIAIS / FEEDBACK / NOVIDADES
// ============================================================

export interface ReportSummary {
  id: string;
  slug: string;
  name: string;
  accounts: number;
  metrics: number;
  views: number;
  hasPassword: boolean;
  updatedAt: string;
}

export const MOCK_REPORTS: ReportSummary[] = [
  { id: "rp1", slug: "dfed706ed72543c8a019b88e",  name: "Ruazinha Gastronomia",  accounts: 1, metrics: 12, views: 47, hasPassword: false, updatedAt: "12/03/2026" },
  { id: "rp2", slug: "70c85bab44aa48f192c3b1e9", name: "Dr. João",                accounts: 1, metrics: 18, views: 12, hasPassword: false, updatedAt: "12/03/2026" },
  { id: "rp3", slug: "c92435536b6c4d728ab5f721", name: "Piercing Joia",           accounts: 1, metrics: 14, views: 28, hasPassword: false, updatedAt: "12/03/2026" },
  { id: "rp4", slug: "335558ae3fe249b6d8027c18", name: "Dr Gabriel Marzola",      accounts: 1, metrics: 10, views: 8,  hasPassword: true,  updatedAt: "11/03/2026" },
  { id: "rp5", slug: "d29212d725344d8f9a2e47b6", name: "Motel Vitara",            accounts: 1, metrics: 16, views: 22, hasPassword: false, updatedAt: "11/03/2026" },
  { id: "rp6", slug: "228f1ccd85e7458b3c92fa31", name: "Bloco do Neiffs",         accounts: 1, metrics: 12, views: 15, hasPassword: false, updatedAt: "11/03/2026" },
  { id: "rp7", slug: "a05735ca913745d9b8c2e017", name: "Oue",                     accounts: 2, metrics: 20, views: 41, hasPassword: false, updatedAt: "10/03/2026" },
];

// Subtítulo (cliente/conta) para cada relatório
export const REPORT_SUBTITLES: Record<string, string> = {
  rp1: "Ruazinha Gastronomia",
  rp2: "Dr Joao",
  rp3: "Piercing Joia – CA01",
  rp4: "CA – DR GABRIEL MARZOLA",
  rp5: "Motel Vitara",
  rp6: "Auletta Store",
  rp7: "2 contas",
};

export interface Tutorial {
  id: number;
  title: string;
  duration: string;
  category: "primeiros-passos" | "avancado" | "operacao" | "automacao";
  description: string;
}

export const TUTORIALS: Tutorial[] = [
  { id: 1, title: "Configurações Iniciais",                duration: "2:34", category: "primeiros-passos", description: "Cadastre conta, conecte Meta, escolha tema." },
  { id: 2, title: "Filtros e Busca Avançada",              duration: "3:12", category: "operacao",         description: "Use sintaxe + (OR) e ; (AND) pra encontrar campanhas rápido." },
  { id: 3, title: "Criar Públicos Personalizados",         duration: "4:08", category: "operacao",         description: "Custom Audiences e Lookalikes da Meta em 1 clique." },
  { id: 4, title: "Central de Contas",                     duration: "2:50", category: "operacao",         description: "Visão consolidada cross-account com grupos." },
  { id: 5, title: "Relatórios White-label",                duration: "5:21", category: "operacao",         description: "Gere relatórios profissionais pra clientes." },
  { id: 6, title: "Integrações UTMs",                      duration: "6:14", category: "avancado",         description: "Conecte Hotmart, Kiwify e veja conversão real." },
  { id: 7, title: "Meta Ads Editor — 100+ ads em 5min",   duration: "4:45", category: "avancado",         description: "Diferencial flagship: upload em massa em fila." },
  { id: 8, title: "Duplicar Campanhas Inteligente",        duration: "3:38", category: "operacao",         description: "Duplica campanhas com variações automáticas." },
  { id: 9, title: "Duplicar Para Outra Conta",             duration: "2:55", category: "avancado",         description: "Cross-account: copia toda estrutura de conta A pra B." },
];

export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  type: "feature" | "fix" | "improvement";
  description: string;
  isNew?: boolean;
}

export const CHANGELOG: ChangelogEntry[] = [
  { id: "c1", date: "2026-04-29", title: "Otimização por IA (preview)",        type: "feature",     description: "Distribui orçamento entre campanhas automaticamente, mostra MER Blended e Top Performer.", isNew: true },
  { id: "c2", date: "2026-04-25", title: "Modo Privacidade global",            type: "feature",     description: "Botão olho no header oculta nomes de campanhas em todas as telas — útil pra gravar tutoriais.", isNew: true },
  { id: "c3", date: "2026-04-22", title: "Duplicar para outra conta",          type: "feature",     description: "Selecione campanhas e duplique a estrutura inteira pra outra ad account.", isNew: true },
  { id: "c4", date: "2026-04-18", title: "Suporte a Hubla nas integrações",    type: "improvement", description: "Mais uma plataforma de checkout brasileira: Hubla agora gera webhook de UTM real." },
  { id: "c5", date: "2026-04-12", title: "Fix: Editor travava em vídeos > 200MB", type: "fix",      description: "Worker agora trata uploads acima de 200MB sem perder progresso." },
];

export interface FeedbackIdea {
  id: string;
  title: string;
  type: "feature" | "fix" | "question";
  votes: number;
  voted?: boolean;
  status: "shipped" | "planned" | "considering" | "open";
  author: string;
  ago: string;
}

export const FEEDBACK_IDEAS: FeedbackIdea[] = [
  { id: "f1", title: "Suporte a TikTok Ads",                         type: "feature", votes: 287, status: "considering", author: "Lucas P.", ago: "há 12d" },
  { id: "f2", title: "Exportar relatório como PDF customizado",       type: "feature", votes: 156, voted: true, status: "planned",     author: "Mariana C.", ago: "há 8d" },
  { id: "f3", title: "Alerta quando uma regra causa quedas bruscas",  type: "feature", votes: 94,  status: "open",       author: "Vinny K.", ago: "há 5d" },
  { id: "f4", title: "Modo escuro nas telas públicas de relatório",   type: "feature", votes: 71,  voted: true, status: "shipped",     author: "Pedro G.", ago: "há 2d" },
  { id: "f5", title: "Bug: filtro 'tiveram veiculação' inclui pausados", type: "fix",  votes: 23,  status: "shipped",     author: "Sofia R.", ago: "ontem" },
];

// ============================================================
// AFILIADO
// ============================================================
export const AFFILIATE_KPIS = {
  clicks: 1_847,
  signups: 142,
  conversionRate: 0.077, // 7.7%
  activeSubscriptions: 38,
  pendingBalance: 1_210, // BRL
  availableBalance: 487, // BRL
  next30dProjection: 1_960,
};

// 30 dias de cliques pra mini-chart
export const AFFILIATE_CLICKS_30D = [
  42, 58, 33, 71, 64, 49, 88, 102, 67, 73, 91, 84, 76, 110, 95,
  68, 53, 87, 99, 124, 88, 71, 64, 92, 105, 78, 69, 84, 113, 101,
];

export const AFFILIATE_PROHIBITED = [
  { title: "Brand bidding em buscadores",        body: "Não é permitido comprar palavras-chave 'Ad Manager', 'Adseditor', 'AdsEditor' ou variações nos buscadores." },
  { title: "Páginas se passando pela marca",      body: "Não criar perfis no Instagram, Facebook, X ou TikTok usando o nome ou logo do Ad Manager." },
  { title: "Sites idênticos ao oficial",         body: "Não copiar landing page oficial. Crie conteúdo próprio com seu link de afiliado." },
  { title: "Cookie-stuffing",                     body: "Injetar o cookie sem clique consciente do usuário invalida a comissão e gera banimento." },
  { title: "Spam por e-mail ou WhatsApp em massa", body: "Mensagens não solicitadas em massa estão proibidas pelas regras do programa e por leis BR." },
  { title: "Recrutar nas redes oficiais",         body: "Comentar ofertas no Instagram, YouTube ou comunidade WhatsApp do Ad Manager é proibido." },
];

// ============================================================
// EQUIPE
// ============================================================
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  initials: string;
  status: "active" | "pending";
  invitedAt?: string;
}

export const MOCK_TEAM: TeamMember[] = [
  { id: "u1", name: "Vinny Kenzo",      email: "vinnykenzo@gmail.com", role: "admin",  initials: "VK", status: "active" },
  { id: "u2", name: "Mariana Costa",    email: "mariana@agencia.com",  role: "editor", initials: "MC", status: "active" },
  { id: "u3", name: "Pedro Almeida",    email: "pedro@agencia.com",    role: "viewer", initials: "PA", status: "pending", invitedAt: "há 2d" },
];

// ============================================================
// AUDIENCES — Bulk generator
// ============================================================

// Sub-opções de cada categoria de público (estrutura igual ao produto real)
export const AUDIENCE_IG_ENGAGEMENT = [
  { id: "ig_visit",    label: "Visitaram o perfil" },
  { id: "ig_engage",   label: "Engajaram com publicação ou anúncio" },
  { id: "ig_save",     label: "Salvaram publicação" },
  { id: "ig_message",  label: "Enviaram mensagem" },
  { id: "ig_story",    label: "Engajaram com story" },
] as const;

export const AUDIENCE_FB_ENGAGEMENT = [
  { id: "fb_visit",    label: "Visitaram a página" },
  { id: "fb_engage",   label: "Se envolveram com a página" },
  { id: "fb_message",  label: "Enviaram mensagem" },
  { id: "fb_save",     label: "Salvaram publicações" },
  { id: "fb_event",    label: "Responderam a eventos" },
] as const;

export const AUDIENCE_VIDEO_VIEWS = [
  { id: "v_3s",        label: "Assistiram 3 segundos" },
  { id: "v_10s",       label: "Assistiram 10 segundos (ThruPlay)" },
  { id: "v_25",        label: "Assistiram 25%" },
  { id: "v_50",        label: "Assistiram 50%" },
  { id: "v_75",        label: "Assistiram 75%" },
] as const;

export const AUDIENCE_SITE_TIME = [
  { id: "site_all",    label: "Todos os visitantes" },
  { id: "site_5",      label: "Tempo no site 5%" },
  { id: "site_10",     label: "Tempo no site 10%" },
  { id: "site_25",     label: "Tempo no site 25%" },
] as const;

// Eventos do Pixel com contagem mock — destaque os que têm dados (pixel ativo)
export const AUDIENCE_PIXEL_EVENTS = [
  { id: "PageView",            label: "PageView",            count: 7_452 },
  { id: "Lead",                label: "Lead",                count: 3_637 },
  { id: "CompleteRegistration",label: "CompleteRegistration",count: 123 },
  { id: "Purchase",            label: "Purchase",            count: 43 },
  { id: "SubmitApplication",   label: "SubmitApplication",   count: 3 },
  { id: "ViewContent",         label: "ViewContent",         count: 0 },
  { id: "Search",              label: "Search",              count: 0 },
  { id: "AddToCart",           label: "AddToCart",           count: 0 },
  { id: "AddToWishlist",       label: "AddToWishlist",       count: 0 },
  { id: "InitiateCheckout",    label: "InitiateCheckout",    count: 0 },
  { id: "AddPaymentInfo",      label: "AddPaymentInfo",      count: 0 },
  { id: "Contact",             label: "Contact",             count: 0 },
  { id: "FindLocation",        label: "FindLocation",        count: 0 },
  { id: "Schedule",            label: "Schedule",            count: 0 },
  { id: "Subscribe",           label: "Subscribe",           count: 0 },
  { id: "CustomizeProduct",    label: "CustomizeProduct",    count: 0 },
  { id: "Donate",              label: "Donate",              count: 0 },
  { id: "StartTrial",          label: "StartTrial",          count: 0 },
] as const;

export const AUDIENCE_LOOKALIKE_SIZES = [
  { id: "lal_1",       label: "1% — mais preciso" },
  { id: "lal_3",       label: "3%" },
  { id: "lal_5",       label: "5%" },
  { id: "lal_10",      label: "10% — mais alcance" },
] as const;

export const AUDIENCE_RETENTION_PERIODS = [
  "1d", "3d", "5d", "7d", "14d", "30d", "60d", "90d", "120d", "180d", "365d", "730d",
] as const;

// 18 vídeos mock pra Video View seleção
export const MOCK_VIDEOS = [
  { id: "v1",  title: "O que aconteceu",          color: "#FF6B6B" },
  { id: "v2",  title: "Quem antecipa",            color: "#4ECDC4" },
  { id: "v3",  title: "França imobiliária",       color: "#FFE66D" },
  { id: "v4",  title: "Sorteio da Tesla",         color: "#A78BFA" },
  { id: "v5",  title: "Chega de drama",           color: "#FB923C" },
  { id: "v6",  title: "2025 foi difícil",         color: "#34D399" },
  { id: "v7",  title: "Em nome de quem",          color: "#F472B6" },
  { id: "v8",  title: "A Guaíra Imobiliária",     color: "#60A5FA" },
  { id: "v9",  title: "A Pantera Imobiliária",    color: "#C084FC" },
  { id: "v10", title: "A Imobiliária do Anderson",color: "#FDE047" },
  { id: "v11", title: "Confira o nosso",          color: "#94A3B8" },
  { id: "v12", title: "A Roque Imóveis",          color: "#FBBF24" },
  { id: "v13", title: "Confraria Universal",      color: "#10B981" },
  { id: "v14", title: "A CashGO entrega",         color: "#3B82F6" },
  { id: "v15", title: "Confira o desconto",       color: "#EC4899" },
  { id: "v16", title: "Fernanda Ribeiro",         color: "#F59E0B" },
  { id: "v17", title: "Vanessa Camargo",          color: "#8B5CF6" },
  { id: "v18", title: "Confira o lançamento",     color: "#EF4444" },
] as const;
