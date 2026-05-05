/**
 * Supabase admin client (service_role key — bypass RLS).
 *
 * USAR APENAS em endpoints server-side que rodam com auth de cron (Bearer token)
 * ou em jobs administrativos. Nunca expor essa chave ao cliente.
 *
 * Use cases:
 *  - /api/cron/* — cron Vercel chama sem cookie de user, RLS bloquearia tudo
 *  - jobs administrativos (reset password, sync background, etc)
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada — cron real não vai funcionar");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
