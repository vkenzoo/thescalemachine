/**
 * GET    /api/integracoes/projects        — lista projetos do user (com últimos eventos)
 * POST   /api/integracoes/projects        — cria
 * PATCH  /api/integracoes/projects        — atualiza signing_secret ou flags de checklist
 * DELETE /api/integracoes/projects?id=…   — remove
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const VALID = ["hotmart", "kiwify", "hubla", "assiny"] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: projects, error } = await supabase
    .from("utm_projects")
    .select(`
      id,name,platform,ad_account_id,webhook_token,
      script_installed,utms_configured,webhook_configured,
      signing_secret_ciphertext,
      last_event_at,created_at,
      ad_accounts(account_id,name)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pega últimos 5 eventos por projeto + count total
  const projectIds = (projects ?? []).map((p: any) => p.id);
  let recentByProject: Record<string, any[]> = {};
  let countsByProject: Record<string, number> = {};

  if (projectIds.length > 0) {
    const { data: recent } = await supabase
      .from("utm_sales_raw")
      .select("id,project_id,occurred_at,gross_value_cents,utm_campaign,utm_term,product_name,status")
      .in("project_id", projectIds)
      .order("occurred_at", { ascending: false })
      .limit(50);

    for (const ev of recent ?? []) {
      const pid = (ev as any).project_id;
      if (!recentByProject[pid]) recentByProject[pid] = [];
      if (recentByProject[pid].length < 5) recentByProject[pid].push(ev);
      countsByProject[pid] = (countsByProject[pid] ?? 0) + 1;
    }
  }

  const enriched = (projects ?? []).map((p: any) => ({
    ...p,
    has_secret: !!p.signing_secret_ciphertext,
    signing_secret_ciphertext: undefined,  // não vaza ciphertext pro cliente
    ad_account: p.ad_accounts ? { account_id: p.ad_accounts.account_id, name: p.ad_accounts.name } : null,
    ad_accounts: undefined,
    recent_events: recentByProject[p.id] ?? [],
    events_count: countsByProject[p.id] ?? 0,
  }));

  return NextResponse.json({ projects: enriched });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const platform = String(body.platform ?? "").toLowerCase();
  const adAccountUuid = body.ad_account_id ? String(body.ad_account_id) : null;
  const signingSecret = body.signing_secret ? String(body.signing_secret).trim() : null;

  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!VALID.includes(platform as any)) return NextResponse.json({ error: "invalid_platform" }, { status: 400 });

  const insert: any = {
    user_id: user.id,
    name,
    platform,
    ad_account_id: adAccountUuid,
  };
  if (signingSecret) insert.signing_secret_ciphertext = encrypt(signingSecret);

  const { data, error } = await supabase
    .from("utm_projects")
    .insert(insert)
    .select("id,name,platform,webhook_token")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "db_error", detail: error?.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, project: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const update: any = {};
  if (body.name) update.name = String(body.name).trim();
  if (body.signing_secret) update.signing_secret_ciphertext = encrypt(String(body.signing_secret).trim());
  if (typeof body.script_installed === "boolean") update.script_installed = body.script_installed;
  if (typeof body.utms_configured === "boolean") update.utms_configured = body.utms_configured;
  if (typeof body.webhook_configured === "boolean") update.webhook_configured = body.webhook_configured;
  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("utm_projects")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { error } = await supabase
    .from("utm_projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
