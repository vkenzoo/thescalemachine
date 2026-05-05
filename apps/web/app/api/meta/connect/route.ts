/**
 * POST /api/meta/connect
 *
 * Persiste a conexão. Re-roda validate (defensivo TOCTOU) antes de gravar.
 * Criptografa o token (e o app_secret quando Caminho B), insere meta_connections
 * + bulk insert ad_accounts.
 *
 * Body: {
 *   access_token,
 *   business_manager_id,
 *   app_id?:     string,
 *   app_secret?: string,    // se presente, vai criptografado e usado nas chamadas Graph
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateToken } from "@/lib/meta/connect-manual";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = body.access_token?.trim();
  const bmId = body.business_manager_id?.trim();
  const appId = body.app_id?.trim() || null;
  const appSecret = body.app_secret?.trim() || null;

  if (!token || !bmId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if ((appId && !appSecret) || (!appId && appSecret)) {
    return NextResponse.json({
      error: "invalid_app_pair",
      detail: "App ID e App Secret devem ser fornecidos juntos.",
    }, { status: 400 });
  }

  // Re-valida (defensivo contra TOCTOU)
  const result = await validateToken(token, bmId, appSecret);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  // Criptografa antes de gravar
  const tokenCiphertext = encrypt(token);
  const appSecretCiphertext = appSecret ? encrypt(appSecret) : null;

  const { data: connection, error: connErr } = await supabase
    .from("meta_connections")
    .upsert({
      user_id: user.id,
      connection_type: "system_user",
      fb_user_id: result.fb_user_id,
      fb_user_name: result.fb_user_name,
      business_manager_id: result.business_manager_id,
      business_manager_name: result.business_manager_name,
      access_token_ciphertext: tokenCiphertext,
      app_id: appId,
      app_secret_ciphertext: appSecretCiphertext,
      granted_scopes: result.granted_scopes,
      expires_at: null,
      last_synced_at: new Date().toISOString(),
      status: "active",
    }, { onConflict: "user_id,business_manager_id" })
    .select()
    .single();

  if (connErr || !connection) {
    return NextResponse.json({ error: "db_error", detail: connErr?.message }, { status: 500 });
  }

  // Bulk upsert das ad accounts
  const accountsRows = result.ad_accounts.map((acc) => ({
    connection_id: connection.id,
    user_id: user.id,
    account_id: acc.id,
    name: acc.name,
    currency: acc.currency,
    timezone_name: acc.timezone_name,
    account_status: acc.account_status,
    balance_cents: parseInt(acc.balance ?? "0") || 0,
    amount_spent_cents: parseInt(acc.amount_spent ?? "0") || 0,
    disable_reason: acc.disable_reason ?? null,
    last_synced_at: new Date().toISOString(),
  }));

  const { error: accErr } = await supabase
    .from("ad_accounts")
    .upsert(accountsRows, { onConflict: "connection_id,account_id" });

  if (accErr) {
    return NextResponse.json({ error: "db_error", detail: accErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    connection_id: connection.id,
    accounts_count: accountsRows.length,
    business_manager_name: result.business_manager_name,
    mode: appId ? "client_app" : "shared_app",
  });
}
