/**
 * Helper que roda dentro do middleware Next.js.
 * Refresca a sessão do Supabase em CADA request — sem isso, o token expira silenciosamente
 * e o usuário fica deslogado depois de ~1h.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() valida o JWT contra o servidor Supabase, não confia em cookies locais.
  // Não substituir por getSession() — esse é vulnerável a tampering.
  // TEMPORARY: timeout de 5s pra não travar dev se Supabase tiver lento.
  let user: any = null;
  try {
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 5000)
    );
    const result = await Promise.race([userPromise, timeoutPromise]);
    user = result.data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;

  // Rotas públicas (sem auth): tudo em (auth) + landing pages legais
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot") ||
    path.startsWith("/reset") ||
    path.startsWith("/terms") ||
    path.startsWith("/privacy") ||
    path.startsWith("/r/") ||      // relatórios públicos compartilhados
    path.startsWith("/auth/") ||   // callbacks OAuth do Supabase
    path === "/";                  // se quiser landing page futura

  // Sem usuário tentando acessar rota privada → redireciona pra /login
  if (!user && !isPublic && !path.startsWith("/_next") && !path.startsWith("/api/")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // Logado tentando acessar /login ou /signup → manda pro app
  if (user && (path === "/login" || path === "/signup")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}
