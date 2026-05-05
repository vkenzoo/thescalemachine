/**
 * GET  /api/rules — lista regras do usuário
 * POST /api/rules — cria nova regra
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("rules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  if (!body.action) {
    return NextResponse.json({ error: "missing_action" }, { status: 400 });
  }
  if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
    return NextResponse.json({ error: "missing_conditions" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rules")
    .insert({
      user_id: user.id,
      name: body.name,
      accounts_filter: body.accounts_filter ?? [],
      scope: body.scope ?? "Campanhas Ativas",
      name_filter_op: body.name_filter_op ?? "any",
      name_filter_text: body.name_filter_text ?? "",
      action: body.action,
      action_value: body.action_value ?? null,
      action_unit: body.action_unit ?? "pct",
      conditions: body.conditions,
      period: body.period ?? "last_7d",
      schedule_mode: body.schedule_mode ?? "continuous",
      frequency: body.frequency ?? "30min",
      interval_mode: body.interval_mode ?? "any",
      daily_limit: body.daily_limit ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}
