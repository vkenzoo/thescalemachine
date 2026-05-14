/**
 * Helpers de admin — controla acesso ao /admin via lista de emails em env.
 *
 * Uso:
 *   const adminEmail = await requireAdmin();
 *   if (!adminEmail) return notFound();   // 404 silencioso, não vaza existência
 */

import { createClient } from "@/lib/supabase/server";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * Retorna o email do user se ele for admin, senão null.
 * Use em pages/route handlers do /admin pra checagem.
 */
export async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const admins = getAdminEmails();
  if (admins.length === 0) return null;
  if (!admins.includes(user.email.toLowerCase())) return null;
  return user.email;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
