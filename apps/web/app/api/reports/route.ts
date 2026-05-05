/**
 * GET    /api/reports        — lista relatórios do user
 * POST   /api/reports        — cria
 * PATCH  /api/reports        — atualiza
 * DELETE /api/reports?id=…   — remove
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

function generateSlug(): string {
  // 24 chars hex (mesmo formato dos mocks)
  return randomBytes(12).toString("hex");
}

const VALID_LEVELS = ["Campanhas", "Conjuntos de Anúncios", "Anúncios"];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wantTemplates = new URL(req.url).searchParams.get("templates") === "1";

  let q = supabase
    .from("reports")
    .select("id,slug,name,level,accounts,metrics,sections,funnel_steps,is_public,password_hash,views,is_template,updated_at,created_at")
    .order("updated_at", { ascending: false });

  q = wantTemplates ? q.eq("is_template", true) : q.eq("is_template", false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (wantTemplates) {
    return NextResponse.json({
      templates: (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        level: r.level,
        accounts: r.accounts ?? [],
        metrics: r.metrics ?? [],
        sections: r.sections ?? [],
        funnel_steps: r.funnel_steps ?? [],
      })),
    });
  }

  const reports = (data ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    accounts: r.accounts.length,
    metrics: r.metrics.length,
    views: r.views,
    hasPassword: !!r.password_hash,
    is_public: r.is_public,
    level: r.level,
    updatedAt: new Date(r.updated_at).toLocaleDateString("pt-BR"),
  }));

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });

  const level = VALID_LEVELS.includes(body.level) ? body.level : "Campanhas";
  const accounts = Array.isArray(body.accounts) ? body.accounts.map(String) : [];
  const metrics = Array.isArray(body.metrics) ? body.metrics.map(String) : [];
  const sections = Array.isArray(body.sections) ? body.sections.map(String) : [];
  const funnel_steps = Array.isArray(body.funnel_steps) ? body.funnel_steps.map(String) : [];
  const ig_account = body.ig_account ? String(body.ig_account).trim() : null;
  const is_public = body.is_public !== false;
  const is_template = body.is_template === true;
  const password_hash = body.password ? hashPassword(String(body.password)) : null;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      slug: generateSlug(),
      name,
      level,
      accounts,
      metrics,
      sections,
      funnel_steps,
      ig_account,
      is_public,
      is_template,
      password_hash,
    })
    .select("id,slug,name")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "db_error", detail: error?.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, report: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const update: any = { updated_at: new Date().toISOString() };
  if (body.name) update.name = String(body.name).trim();
  if (body.level && VALID_LEVELS.includes(body.level)) update.level = body.level;
  if (Array.isArray(body.accounts)) update.accounts = body.accounts.map(String);
  if (Array.isArray(body.metrics)) update.metrics = body.metrics.map(String);
  if (Array.isArray(body.sections)) update.sections = body.sections.map(String);
  if (Array.isArray(body.funnel_steps)) update.funnel_steps = body.funnel_steps.map(String);
  if (typeof body.is_public === "boolean") update.is_public = body.is_public;
  if (typeof body.is_template === "boolean") update.is_template = body.is_template;
  if (body.password !== undefined) {
    update.password_hash = body.password ? hashPassword(String(body.password)) : null;
  }

  const { error } = await supabase
    .from("reports")
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
    .from("reports")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Hash simples — pra production trocar por bcrypt/argon2
function hashPassword(plain: string): string {
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(plain).digest("hex");
}
