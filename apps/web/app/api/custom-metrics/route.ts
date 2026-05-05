/**
 * GET    /api/custom-metrics          — lista métricas do user
 * POST   /api/custom-metrics          — cria
 *   body: { label, formula, format, good_is_up }
 * PATCH  /api/custom-metrics          — atualiza (id obrigatório)
 * DELETE /api/custom-metrics?id=...   — remove
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateFormula } from "@/lib/formula";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_VARS = [
  "spend", "budget", "impressions", "reach", "frequency", "clicks", "ctr", "cpc", "cpm",
  "purchases", "cpa", "revenue", "roas", "roi",
  "leads", "cpl", "cart_adds", "cp_cart", "checkouts", "cp_checkout",
  "messages", "cp_message", "ics", "cp_ic",
  "ig_visits", "cp_ig_visit",
];

const VALID_FORMATS = ["currency", "percent", "number", "ratio"];

function slugify(s: string): string {
  return "cm_" + s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("custom_metrics")
    .select("id,key,label,formula,format,good_is_up,created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ metrics: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  const formula = String(body.formula ?? "").trim();
  const format = String(body.format ?? "number");
  const goodIsUp = body.good_is_up !== false;

  if (!label) return NextResponse.json({ error: "missing_label" }, { status: 400 });
  if (!formula) return NextResponse.json({ error: "missing_formula" }, { status: 400 });
  if (!VALID_FORMATS.includes(format)) return NextResponse.json({ error: "invalid_format" }, { status: 400 });

  const validation = validateFormula(formula, ALLOWED_VARS);
  if (!validation.ok) {
    return NextResponse.json({ error: "invalid_formula", detail: validation.error }, { status: 400 });
  }

  let key = slugify(label);
  if (!key || key === "cm_") key = "cm_" + Math.random().toString(36).slice(2, 8);

  // Resolve colisão de chave
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? key : `${key}_${attempt}`;
    const { data: exists } = await supabase
      .from("custom_metrics")
      .select("id")
      .eq("user_id", user.id)
      .eq("key", candidate)
      .maybeSingle();
    if (!exists) { key = candidate; break; }
    attempt++;
    if (attempt > 50) {
      key = "cm_" + Math.random().toString(36).slice(2, 8);
      break;
    }
  }

  const { data, error } = await supabase
    .from("custom_metrics")
    .insert({ user_id: user.id, key, label, formula, format, good_is_up: goodIsUp })
    .select("id,key,label,formula,format,good_is_up")
    .single();

  if (error || !data) return NextResponse.json({ error: "db_error", detail: error?.message }, { status: 500 });
  return NextResponse.json({ ok: true, metric: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const update: any = { updated_at: new Date().toISOString() };
  if (body.label) update.label = String(body.label).trim();
  if (body.formula) {
    const v = validateFormula(String(body.formula).trim(), ALLOWED_VARS);
    if (!v.ok) return NextResponse.json({ error: "invalid_formula", detail: v.error }, { status: 400 });
    update.formula = String(body.formula).trim();
  }
  if (body.format && VALID_FORMATS.includes(body.format)) update.format = body.format;
  if (typeof body.good_is_up === "boolean") update.good_is_up = body.good_is_up;

  const { error } = await supabase
    .from("custom_metrics")
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
    .from("custom_metrics")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
