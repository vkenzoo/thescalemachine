/**
 * Supabase browser client — usado em Client Components ("use client").
 * Singleton no escopo do browser, sincroniza cookies automaticamente com o server.
 *
 * Uso típico:
 *   const supabase = createClient();
 *   const { data } = await supabase.from("campaigns").select("*");
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
