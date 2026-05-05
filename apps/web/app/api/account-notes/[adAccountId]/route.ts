/**
 * GET  /api/account-notes/:adAccountId  — lê a nota
 * PUT  /api/account-notes/:adAccountId  — upsert
 *
 * `adAccountId` aqui é o `account_id` da Meta (act_xxx) — usamos pra resolver
 * o uuid da ad_accounts row antes de gravar (account_notes.ad_account_id é uuid).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function resolveAdAccountUuid(supabase: any, userId: string, accountIdMeta: string) {
  const { data } = await supabase
    .from("ad_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", accountIdMeta)
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ adAccountId: string }> }
) {
  const { adAccountId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const uuid = await resolveAdAccountUuid(supabase, user.id, adAccountId);
  if (!uuid) return NextResponse.json({ note: "", updated_at: null });

  const { data } = await supabase
    .from("account_notes")
    .select("note, updated_at")
    .eq("ad_account_id", uuid)
    .maybeSingle();

  return NextResponse.json({
    note: data?.note ?? "",
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ adAccountId: string }> }
) {
  const { adAccountId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note : "";

  const uuid = await resolveAdAccountUuid(supabase, user.id, adAccountId);
  if (!uuid) return NextResponse.json({ error: "account_not_found" }, { status: 404 });

  const { data, error } = await supabase
    .from("account_notes")
    .upsert(
      {
        ad_account_id: uuid,
        user_id: user.id,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ad_account_id" }
    )
    .select("note, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data.note, updated_at: data.updated_at });
}
