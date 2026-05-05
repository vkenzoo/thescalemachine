/**
 * Helpers de avaliação compartilhados entre cron de regras e cron de alertas.
 *
 *  - getMetricValue: mapeia metric_id → valor calculado a partir do insights bruto
 *  - evalCondition: aplica operador (gt/lt/gte/lte/eq) entre valor e threshold
 *  - periodToDatePreset: traduz period_id (ex: "last_7d") pro date_preset da Graph
 *  - frequencyToMs: traduz frequency_id (ex: "30min") pra milissegundos
 *  - parseAction: extrai contagem de actions[] da Graph (purchases, leads, etc)
 */

export interface InsightRow {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

export function parseAction(actions: { action_type: string; value: string }[] | undefined, types: string[]): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (types.includes(a.action_type)) total += parseFloat(a.value || "0");
  }
  return total;
}

/**
 * Extrai todas as métricas conhecidas do insights row em um objeto plano.
 * Inclui métricas calculadas (CPA, ROAS, etc).
 */
export function expandMetrics(ins: InsightRow | null | undefined, dailyBudget = 0): Record<string, number> {
  const i = ins ?? {};
  const spend = parseFloat(i.spend ?? "0");
  const impressions = parseInt(i.impressions ?? "0");
  const clicks = parseInt(i.clicks ?? "0");
  const reach = parseInt(i.reach ?? "0");
  const frequency = parseFloat(i.frequency ?? "0");
  const cpc = parseFloat(i.cpc ?? "0");
  const cpm = parseFloat(i.cpm ?? "0");
  const ctr = parseFloat(i.ctr ?? "0") / 100; // Graph retorna em pontos percentuais

  const purchases = parseAction(i.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
  const revenue = parseAction(i.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
  const leads = parseAction(i.actions, ["lead", "offsite_conversion.fb_pixel_lead"]);
  const messages = parseAction(i.actions, ["onsite_conversion.messaging_first_reply", "onsite_conversion.total_messaging_connection"]);
  const ics = parseAction(i.actions, ["onsite_conversion.messaging_conversation_started_7d"]);
  const conversations = ics;
  const cartAdds = parseAction(i.actions, ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"]);
  const checkouts = parseAction(i.actions, ["initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"]);
  const pageViews = parseAction(i.actions, ["page_view", "landing_page_view"]);

  const cpa = purchases > 0 ? spend / purchases : 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const profit = revenue - spend;
  const margin = revenue > 0 ? profit / revenue : 0;
  const roi = spend > 0 ? profit / spend : 0;
  const cpl = leads > 0 ? spend / leads : 0;
  const cpMessage = messages > 0 ? spend / messages : 0;
  const cpConversation = conversations > 0 ? spend / conversations : 0;
  const cpv = pageViews > 0 ? spend / pageViews : 0;
  const cpi = checkouts > 0 ? spend / checkouts : 0;

  return {
    spend,
    impressions,
    reach,
    clicks,
    ctr,
    cpc,
    cpm,
    frequency,
    purchases,
    revenue,
    cpa,
    roas,
    profit,
    margin,
    roi,
    leads,
    cpl,
    messages,
    cp_message: cpMessage,
    ics,
    conversations,
    cost_per_conversation: cpConversation,
    cost_per_lead: cpl,
    cost_per_purchase: cpa,
    cost_per_message: cpMessage,
    cost_per_result: cpa,         // approx — depende do objective
    cart_adds: cartAdds,
    checkouts,
    sales: purchases,
    utm_purchases: purchases,     // V2: real UTM count
    page_views: pageViews,
    budget: dailyBudget,
    cpi,
    cpv,
  };
}

export function evalCondition(value: number, op: string, threshold: number): boolean {
  switch (op) {
    case "gt":
      return value > threshold;
    case "lt":
      return value < threshold;
    case "gte":
      return value >= threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return Math.abs(value - threshold) < 0.0001;
    default:
      return false;
  }
}

const PERIOD_TO_DATE_PRESET: Record<string, string> = {
  today:        "today",
  yesterday:    "yesterday",
  last_3d:      "last_3d",
  last_7d:      "last_7d",
  last_7d_inc:  "last_7d",        // inclui hoje (default Graph)
  last_7d_exc:  "yesterday_to_7_days_ago", // não-existe; aprox usar last_7d
  last_14d:     "last_14d",
  last_30d:     "last_30d",
};

export function periodToDatePreset(period: string): string {
  return PERIOD_TO_DATE_PRESET[period] ?? "last_7d";
}

const FREQUENCY_MS: Record<string, number> = {
  "10min": 10 * 60 * 1000,
  "15min": 15 * 60 * 1000,
  "30min": 30 * 60 * 1000,
  "1h":     1 * 60 * 60 * 1000,
  "2h":     2 * 60 * 60 * 1000,
  "3h":     3 * 60 * 60 * 1000,
  "6h":     6 * 60 * 60 * 1000,
  "daily": 24 * 60 * 60 * 1000,
};

export function frequencyToMs(freq: string): number {
  return FREQUENCY_MS[freq] ?? 30 * 60 * 1000;
}

export function nextRunAt(freq: string, from: Date = new Date()): Date {
  return new Date(from.getTime() + frequencyToMs(freq));
}

/**
 * Aplica filtro de nome (any/contains/not_contains/starts_with).
 */
export function nameMatches(name: string, op: string, text: string): boolean {
  if (op === "any" || !text) return true;
  const lower = name.toLowerCase();
  const t = text.toLowerCase();
  switch (op) {
    case "contains":     return lower.includes(t);
    case "not_contains": return !lower.includes(t);
    case "starts_with":  return lower.startsWith(t);
    default:             return true;
  }
}

/**
 * Mapeia scope (string user-friendly) pra { kind, status }.
 */
export function parseScope(scope: string): { kind: "campaign" | "adset" | "ad"; activeOnly: boolean } {
  const s = scope.toLowerCase();
  let kind: "campaign" | "adset" | "ad" = "campaign";
  if (s.includes("conjunto")) kind = "adset";
  else if (s.includes("anúncio")) kind = "ad";
  const activeOnly = s.includes("ativ");
  return { kind, activeOnly };
}
