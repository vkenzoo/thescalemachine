/**
 * POST /api/meta/connect/validate
 *
 * Roda o checklist de validação do System User Token EM TEMPO REAL
 * conforme o usuário preenche o form em /connect. NÃO persiste nada.
 *
 * Body: {
 *   access_token: string,
 *   business_manager_id: string,
 *   app_id?: string,        // opcional — Caminho B
 *   app_secret?: string,    // opcional — Caminho B (necessário se token foi gerado pelo app do cliente)
 * }
 *
 * Retorna: ValidationResult | ValidationFailure (vide lib/meta/connect-manual.ts)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateToken } from "@/lib/meta/connect-manual";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    access_token?: string;
    business_manager_id?: string;
    app_id?: string;
    app_secret?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = body.access_token?.trim();
  const bmId = body.business_manager_id?.trim();
  const appId = body.app_id?.trim() || null;
  const appSecret = body.app_secret?.trim() || null;

  if (!token || token.length < 30) {
    return NextResponse.json({ ok: false, error: "invalid_token" });
  }
  if (!bmId || !/^\d{8,}$/.test(bmId)) {
    return NextResponse.json({ ok: false, error: "wrong_bm" });
  }
  // Caminho B: se passou app_id, app_secret é obrigatório (e vice-versa)
  if ((appId && !appSecret) || (!appId && appSecret)) {
    return NextResponse.json({
      ok: false,
      error: "invalid_token",
      detail: "Se preencher App ID, precisa preencher App Secret também (e vice-versa).",
    });
  }
  if (appId && !/^\d{8,}$/.test(appId)) {
    return NextResponse.json({ ok: false, error: "invalid_token", detail: "App ID inválido" });
  }

  const result = await validateToken(token, bmId, appSecret);
  return NextResponse.json(result);
}
