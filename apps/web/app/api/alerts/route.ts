/**
 * GET  /api/alerts — lista alertas
 * POST /api/alerts — cria
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_OPS = ["gt", "lt", "eq", "gte", "lte"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  if (!body.metric) return NextResponse.json({ error: "missing_metric" }, { status: 400 });
  if (!body.op || !ALLOWED_OPS.includes(body.op)) {
    return NextResponse.json({ error: "invalid_op" }, { status: 400 });
  }
  if (typeof body.value !== "number" || isNaN(body.value)) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      name: body.name ?? "",
      metric: body.metric,
      op: body.op,
      value: body.value,
      account_filter: body.account_filter ?? "all",
      enabled: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}
