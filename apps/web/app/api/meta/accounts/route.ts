/**
 * GET /api/meta/accounts
 *
 * Lista todas as ad accounts do user logado (todas as conexões Meta).
 * Não bate na Graph API — só lê do nosso DB. Sync acontece no /connect ou refresh manual.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("ad_accounts")
    .select(`
      id,
      account_id,
      name,
      currency,
      timezone_name,
      account_status,
      balance_cents,
      amount_spent_cents,
      last_synced_at,
      meta_connections!inner(business_manager_name, status)
    `)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accounts = (data ?? []).map((a: any) => ({
    id: a.id,
    account_id: a.account_id,
    name: a.name,
    currency: a.currency,
    timezone_name: a.timezone_name,
    status: a.account_status === 1 ? "active" : "disabled",
    balance_cents: a.balance_cents,
    amount_spent_cents: a.amount_spent_cents,
    last_synced_at: a.last_synced_at,
    business_manager_name: a.meta_connections?.business_manager_name,
    connection_status: a.meta_connections?.status,
  }));

  return NextResponse.json({ accounts });
}
