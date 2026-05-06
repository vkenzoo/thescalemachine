"use client";

/**
 * Hooks de dados da Meta — cada um vira uma key SWR.
 * Cache automático de 5min, revalidate on focus, dedup entre componentes.
 */

import useSWR, { mutate } from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/api";

// =============================================================
// Accounts (ad accounts conectadas do user)
// =============================================================
export interface MetaAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string | null;
  status: "active" | "disabled";
  balance_cents: number;
  amount_spent_cents: number;
  last_synced_at: string;
  business_manager_name: string | null;
  connection_status: "active" | "invalid" | "revoked";
}

export function useMetaAccounts() {
  const { data, error, isLoading, mutate: refresh } = useSWR<{ accounts: MetaAccount[] }>(
    "/api/meta/accounts",
    fetcher,
    SWR_CONFIG
  );
  return {
    accounts: data?.accounts ?? [],
    error,
    isLoading,
    refresh,
  };
}

// =============================================================
// Campaigns (estrutura + insights por período)
// =============================================================
export interface MetaCampaignRow {
  id: string;             // meta id (ex: 1202110001000012)
  name: string;
  status: string;
  objective: string | null;
  budgetType: "ABO" | "CBO";
  dailyBudget: number;    // BRL (já dividido por 100)
  lifetimeBudget: number;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;            // 0..1
  cpc: number;
  cpm: number;
  frequency: number;
  purchases: number;
  cpa: number;
  revenue: number;
  roas: number;
  leads: number;
  cpl: number;
  messages: number;
  cpMessage: number;
  igVisits: number;
  cpIg: number;
  cartAdds: number;
  cpCart: number;
  checkouts: number;
  cpCheckout: number;
  whatsapp: number;
  cpWhats: number;
}

export type Period = "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | "last_month" | "maximum";

export function useMetaCampaigns(
  accountId: string | null,
  period: Period = "last_30d",
  options: { compareWithPrevious?: boolean } = {}
) {
  const key = accountId ? `/api/meta/campaigns?account=${accountId}&period=${period}` : null;
  const prevKey = accountId && options.compareWithPrevious
    ? `/api/meta/campaigns?account=${accountId}&period=${period}&previous=1`
    : null;

  const { data, error, isLoading, isValidating, mutate: refresh } = useSWR<{ campaigns: MetaCampaignRow[] }>(
    key, fetcher, SWR_CONFIG
  );
  const { data: prevData } = useSWR<{ campaigns: MetaCampaignRow[] }>(
    prevKey, fetcher, SWR_CONFIG
  );

  return {
    campaigns: data?.campaigns ?? [],
    previousCampaigns: prevData?.campaigns ?? [],
    error,
    isLoading: isLoading || isValidating,
    refresh,
  };
}

// =============================================================
// AdSets (estrutura + insights por conta)
// =============================================================
export interface MetaAdsetRow {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName: string;
  dailyBudget: number;
  lifetimeBudget: number;
  optimizationGoal: string | null;
  billingEvent: string | null;
  targetingSummary: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  purchases: number;
  cpa: number;
  revenue: number;
  roas: number;
  leads: number;
  cpl: number;
  messages: number;
  cpMessage: number;
}

export function useMetaAdsets(accountId: string | null, period: Period = "last_30d") {
  const key = accountId ? `/api/meta/adsets?account=${accountId}&period=${period}` : null;
  const { data, error, isLoading, isValidating, mutate: refresh } = useSWR<{ adsets: MetaAdsetRow[] }>(
    key,
    fetcher,
    SWR_CONFIG
  );
  return {
    adsets: data?.adsets ?? [],
    error,
    isLoading: isLoading || isValidating,
    refresh,
  };
}

// =============================================================
// Ads (estrutura + insights + thumbnails)
// =============================================================
export interface MetaAdRow {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string | null;
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  thumbnailUrl: string | null;
  creativeType: "video" | "image" | "unknown";
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  purchases: number;
  cpa: number;
}

export function useMetaAds(accountId: string | null, period: Period = "last_30d") {
  const key = accountId ? `/api/meta/ads?account=${accountId}&period=${period}` : null;
  const { data, error, isLoading, isValidating, mutate: refresh } = useSWR<{ ads: MetaAdRow[] }>(
    key,
    fetcher,
    SWR_CONFIG
  );
  return {
    ads: data?.ads ?? [],
    error,
    isLoading: isLoading || isValidating,
    refresh,
  };
}

// =============================================================
// Account Insights — Central de Contas (consolidado)
// =============================================================
export interface MetaAccountInsight {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  accountStatus: "active" | "disabled";
  balance: number;
  businessManagerName: string | null;
  fetchStatus: "ok" | "connection_invalid" | "graph_error";
  errorMessage: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  purchases: number;
  cpa: number;
  revenue: number;
  roas: number;
  leads: number;
  messages: number;
  igVisits: number;
  cpIgVisit: number;
}

export function useMetaAccountInsights(period: Period = "last_30d") {
  const { data, error, isLoading, mutate: refresh } = useSWR<{ accounts: MetaAccountInsight[] }>(
    `/api/meta/accounts/insights?period=${period}`,
    fetcher,
    SWR_CONFIG
  );
  return {
    accounts: data?.accounts ?? [],
    error,
    isLoading,
    refresh,
  };
}

// =============================================================
// Balance — Monitor de Saldo (auto-refresh 5min)
// =============================================================
export interface MetaBalanceRow {
  id: string;
  accountId: string;
  name: string;
  currency: string;
  accountStatus: "active" | "disabled";
  businessManagerName: string | null;
  balance: number;
  spendToday: number;
  spendLast7d: number;
  dailyAvg: number;
  daysRemaining: number | null;
  activeCampaigns: number;
  health: "critical" | "low" | "healthy" | "inactive";
  type: "Pré-pago" | "Pós-pago";
  fetchStatus: "ok" | "connection_invalid" | "graph_error";
  errorMessage: string | null;
}

export function useMetaBalance() {
  const { data, error, isLoading, mutate: refresh } = useSWR<{ accounts: MetaBalanceRow[] }>(
    "/api/meta/balance",
    fetcher,
    {
      ...SWR_CONFIG,
      refreshInterval: 5 * 60 * 1000, // 5min — requisito do produto
    }
  );
  return {
    accounts: data?.accounts ?? [],
    error,
    isLoading,
    refresh,
  };
}

/**
 * Sincroniza balance + amount_spent das contas com a Graph API.
 * Roda em background quando o user faz ações no Gerenciador, ou
 * é disparada manualmente pelo botão "Atualizar saldos" do /saldo.
 */
export async function syncAccountBalance(accountId?: string): Promise<void> {
  try {
    await fetch("/api/meta/accounts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(accountId ? { account_id: accountId } : {}),
    });
    // Invalida o cache de balance + accounts pra UI atualizar
    mutate(
      (key) => typeof key === "string" && (key.startsWith("/api/meta/balance") || key.startsWith("/api/meta/accounts")),
      undefined,
      { revalidate: true }
    );
  } catch {
    // silencioso — sync é best-effort
  }
}

/**
 * Force-revalidate global (botão "Atualizar" no toolbar).
 * Limpa cache de campaigns + insights de todas as contas.
 */
export function refreshAllMetaData() {
  mutate(
    (key) => typeof key === "string" && key.startsWith("/api/meta/"),
    undefined,
    { revalidate: true }
  );
}
