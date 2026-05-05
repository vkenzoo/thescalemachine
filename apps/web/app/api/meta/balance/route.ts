/**
 * GET /api/meta/balance
 *
 * Para cada ad_account conectada, busca em paralelo:
 *   - insights de HOJE (pra KPI "Gasto total hoje")
 *   - insights dos ÚLTIMOS 7 DIAS (pra calcular gasto médio diário)
 *   - count de campanhas com effective_status ACTIVE
 *
 * Calcula health/daysRemaining/type no servidor pra UI ficar burra.
 *
 * Saldo (balance) vem do registro local (sincronizado no /connect). Pra
 * uma sincronização em tempo real do balance, precisaria buscar
 * /{act}?fields=balance,amount_spent — adicionar depois se necessário.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaInsight {
  spend?: string;
}

interface MetaCampaignActive {
  id: string;
  effective_status: string;
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: accounts, error: accErr } = await supabase
    .from("ad_accounts")
    .select(`
      id, account_id, name, currency, account_status, balance_cents,
      meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status, business_manager_name)
    `)
    .order("name");

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  const items = await Promise.all(
    (accounts ?? []).map(async (a: any) => {
      const conn = a.meta_connections;
      if (conn.status !== "active") {
        return formatRow(a, null, null, 0, "connection_invalid");
      }
      try {
        const { token, appSecret } = decryptCredentials(conn);
        const [todayRes, weekRes, campaignsRes] = await Promise.all([
          graphGet<{ data: MetaInsight[] }>(token, `/${a.account_id}/insights`, {
            level: "account",
            date_preset: "today",
            fields: "spend",
          }, appSecret).catch(() => ({ data: [] as MetaInsight[] })),
          graphGet<{ data: MetaInsight[] }>(token, `/${a.account_id}/insights`, {
            level: "account",
            date_preset: "last_7d",
            fields: "spend",
          }, appSecret).catch(() => ({ data: [] as MetaInsight[] })),
          graphGet<{ data: MetaCampaignActive[] }>(token, `/${a.account_id}/campaigns`, {
            fields: "id,effective_status",
            effective_status: JSON.stringify(["ACTIVE"]),
            limit: 500,
          }, appSecret).catch(() => ({ data: [] as MetaCampaignActive[] })),
        ]);

        const spendToday = parseFloat(todayRes.data?.[0]?.spend ?? "0");
        const spendLast7d = parseFloat(weekRes.data?.[0]?.spend ?? "0");
        const activeCampaigns = (campaignsRes.data ?? []).filter(
          (c) => c.effective_status === "ACTIVE"
        ).length;

        return formatRow(a, spendToday, spendLast7d, activeCampaigns, "ok");
      } catch (e: any) {
        return formatRow(a, null, null, 0, "graph_error", e.message);
      }
    })
  );

  return NextResponse.json({ accounts: items });
}

function formatRow(
  a: any,
  spendToday: number | null,
  spendLast7d: number | null,
  activeCampaigns: number,
  fetchStatus: "ok" | "connection_invalid" | "graph_error",
  errorMessage?: string
) {
  const balance = a.balance_cents / 100;
  const dailyAvg = spendLast7d != null ? spendLast7d / 7 : 0;
  // Daysremaining só faz sentido quando há saldo E gasto.
  // Se balance é 0, conta é provavelmente pós-pago — sem dias restantes.
  // Se dailyAvg é 0, conta sem gasto recente — também sem dias restantes.
  const daysRemaining =
    balance > 0 && dailyAvg > 0 ? balance / dailyAvg : null;

  // Saúde:
  //   inactive: sem gasto recente OU conta desativada
  //   critical: < 3 dias OR balance > 0 mas conta off
  //   low: 3-7 dias
  //   healthy: > 7 dias OR pós-pago ativo (sem balance)
  const accountStatus = a.account_status === 1 ? "active" : "disabled";
  let health: "critical" | "low" | "healthy" | "inactive";
  if (accountStatus === "disabled") {
    health = "critical";
  } else if (dailyAvg === 0 && (spendLast7d ?? 0) === 0) {
    health = "inactive";
  } else if (daysRemaining == null) {
    // Pós-pago ativo com gasto: assume healthy (sem saldo pra esgotar)
    health = "healthy";
  } else if (daysRemaining < 3) {
    health = "critical";
  } else if (daysRemaining < 7) {
    health = "low";
  } else {
    health = "healthy";
  }

  // Tipo: heurística simples — pré-pago se tem balance, senão pós-pago
  const type: "Pré-pago" | "Pós-pago" = balance > 0 ? "Pré-pago" : "Pós-pago";

  return {
    id: a.id,
    accountId: a.account_id,
    name: a.name,
    currency: a.currency,
    accountStatus,
    businessManagerName: a.meta_connections?.business_manager_name ?? null,
    balance,
    spendToday: spendToday ?? 0,
    spendLast7d: spendLast7d ?? 0,
    dailyAvg,
    daysRemaining,
    activeCampaigns,
    health,
    type,
    fetchStatus,
    errorMessage: errorMessage ?? null,
  };
}
