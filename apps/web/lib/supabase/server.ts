/**
 * Supabase server client — usado em Server Components, Route Handlers e Server Actions.
 * Lê/escreve cookies via next/headers — Auth fica sincronizado com o navegador.
 *
 * Uso típico em Route Handler:
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll é chamado de Server Components — onde não dá pra setar cookie.
            // O middleware refresca a sessão antes do request chegar aqui, então OK ignorar.
          }
        },
      },
    }
  );
}

/**
 * Cliente com privilégios de service_role — IGNORA RLS.
 * Use APENAS em Route Handlers que precisam acessar dados de OUTROS usuários
 * (ex: webhooks que recebem evento de venda e precisam achar o utm_project pelo secret).
 *
 * NUNCA use em código que roda no client.
 */
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}
