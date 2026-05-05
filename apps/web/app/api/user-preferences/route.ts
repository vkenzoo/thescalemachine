/**
 * GET /api/user-preferences — singleton do user (sem ID na URL)
 * PUT /api/user-preferences — upsert (user_id é o PK)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_FIELDS = ["selected_columns", "active_preset_id", "selected_metrics", "privacy_mode"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Defaults se ainda não existe row
  return NextResponse.json({
    preferences: data ?? {
      user_id: user.id,
      selected_columns: [],
      active_preset_id: null,
      selected_metrics: ["spend", "revenue", "roas", "purchases", "cpa", "ctr"],
      privacy_mode: false,
    },
  });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { user_id: user.id };
  for (const k of ALLOWED_FIELDS) {
    if (k in body) updates[k] = body[k];
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(updates, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data });
}
