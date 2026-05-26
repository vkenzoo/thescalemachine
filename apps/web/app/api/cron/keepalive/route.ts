/**
 * GET/POST /api/cron/keepalive
 *
 * Toca o Supabase 1x por dia pra evitar auto-pause do free tier
 * (pausa após ~7 dias sem queries no banco).
 *
 * Faz 1 SELECT minúsculo + grava 1 audit_event de info.
 * Auth: Bearer CRON_SECRET (igual outros crons).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const t0 = Date.now();

  // Query barata só pra movimentar o postgres
  const { error: pingErr } = await supabase
    .from("audit_events")
    .select("id", { head: true, count: "exact" })
    .limit(1);

  // Grava também 1 evento info — assim aparece no /admin com timestamp recente
  const { error: logErr } = await supabase.from("audit_events").insert({
    severity: "info",
    area: "keepalive",
    message: `Supabase keepalive ping (${Date.now() - t0}ms)`,
    tags: { source: "cron" },
  });

  // Limpa eventos de keepalive com mais de 30 dias pra não inflar a tabela
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  await supabase
    .from("audit_events")
    .delete()
    .eq("area", "keepalive")
    .lt("created_at", cutoff);

  return NextResponse.json({
    ok: !pingErr && !logErr,
    ping_ms: Date.now() - t0,
    ping_error: pingErr?.message ?? null,
    log_error: logErr?.message ?? null,
  });
}

export const GET = handle;
export const POST = handle;
