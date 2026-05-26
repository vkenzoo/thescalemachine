/**
 * Reset de senha via service_role.
 * Uso: node reset-password.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = fs.readFileSync("apps/web/.env.local", "utf-8");
const URL = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1];
const SERVICE_KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)?.[1];

if (!URL || !SERVICE_KEY) {
  console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const EMAIL = "vinnykenzo@gmail.com";
const NEW_PASSWORD = "Vini@1402";

const sb = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`🔎 Procurando user ${EMAIL}…`);
const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error("❌ listUsers:", listErr.message); process.exit(1); }

const user = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
if (!user) { console.error(`❌ User com email ${EMAIL} não existe`); process.exit(1); }

console.log(`✓ Achou user id=${user.id}, email confirmado=${!!user.email_confirmed_at}`);
console.log(`🔧 Resetando senha pra "${NEW_PASSWORD}"…`);

const { error: updateErr } = await sb.auth.admin.updateUserById(user.id, {
  password: NEW_PASSWORD,
  email_confirm: true,
});

if (updateErr) {
  console.error("❌ updateUserById:", updateErr.message);
  process.exit(1);
}

console.log("✅ Senha resetada com sucesso!");
console.log(`   Email: ${EMAIL}`);
console.log(`   Senha: ${NEW_PASSWORD}`);
console.log(`\nLoga em https://app.thescalemachine.com.br/login`);
