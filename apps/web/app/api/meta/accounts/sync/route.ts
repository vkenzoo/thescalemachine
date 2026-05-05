/**
 * POST /api/meta/accounts/sync
 *
 * Re-puxa balance + amount_spent + account_status da Graph API pra cada
 * conta conectada do user e atualiza ad_accounts.
 *
 * Body opcional: { account_id?: "act_xxx" }  — se passar, sincroniza só uma.
 *                                              senão, sincroniza todas.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaAccountFresh {
  id: string;
  account_status?: number;
  balance?: string;
  amount_spent?: string;
  disable_reason?: number;
  name?: string;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const onlyAccount = typeof body.account_id === "string" ? body.account_id : null;

  let q = supabase
    .from("ad_accounts")
    .select(`
      id, account_id,
      meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status)
    `)
    .eq("user_id", user.id);
  if (onlyAccount) q = q.eq("account_id", onlyAccount);
  const { data: accounts, error: accErr } = await q;

  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 });
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  const results = await Promise.allSettled(
    accounts.map(async (a: any) => {
      const conn = a.meta_connections;
      if (conn.status !== "active") return { skipped: true, accountId: a.account_id };

      const { token, appSecret } = decryptCredentials(conn);
      const fresh = await graphGet<MetaAccountFresh>(token, `/${a.account_id}`, {
        fields: "id,account_status,balance,amount_spent,disable_reason,name,currency",
      }, appSecret);

      await supabase
        .from("ad_accounts")
        .update({
          balance_cents: parseInt(fresh.balance ?? "0") || 0,
          amount_spent_cents: parseInt(fresh.amount_spent ?? "0") || 0,
          account_status: fresh.account_status ?? 1,
          disable_reason: fresh.disable_reason ?? null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", a.id)
        .eq("user_id", user.id);

      return { synced: true, accountId: a.account_id };
    })
  );

  const synced = results.filter(
    (r) => r.status === "fulfilled" && (r.value as any)?.synced
  ).length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ ok: true, synced, failed, total: accounts.length });
}
