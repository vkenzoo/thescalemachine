/**
 * Helper pra decifrar token + app_secret de uma row de meta_connections.
 *
 * Uso:
 *   const conn = await supabase.from("meta_connections").select("access_token_ciphertext, app_secret_ciphertext, ...").single();
 *   const { token, appSecret } = decryptCredentials(conn);
 *   await graphGet(token, "/me", {}, appSecret);
 */

import { decrypt } from "@/lib/crypto";

export interface ConnRowWithSecrets {
  access_token_ciphertext: string;
  app_secret_ciphertext?: string | null;
}

export function decryptCredentials(conn: ConnRowWithSecrets): {
  token: string;
  appSecret: string | null;
} {
  const token = decrypt(conn.access_token_ciphertext);
  const appSecret = conn.app_secret_ciphertext ? decrypt(conn.app_secret_ciphertext) : null;
  return { token, appSecret };
}
