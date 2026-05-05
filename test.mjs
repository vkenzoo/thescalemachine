import postgres from "postgres";
import fs from "fs";
const env = fs.readFileSync("apps/web/.env.local", "utf-8");
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1];
const sql = postgres(dbUrl, { max: 1 });
try {
  await sql.unsafe(`
    insert into public.notifications (user_id, tone, title, description, link)
    values
      ('982f266a-00cd-46fd-95d8-4405b67bd6ff', 'warning', 'Saldo crítico em FC - 01',
       'Conta com menos de 3 dias de orçamento.', '/saldo'),
      ('982f266a-00cd-46fd-95d8-4405b67bd6ff', 'success', 'Regra disparada',
       '"Pausar CPA acima de R$ 50" pausou 1 campanha.', '/regras'),
      ('982f266a-00cd-46fd-95d8-4405b67bd6ff', 'info', 'Conexão Meta validada',
       '3 ad accounts importadas de Funnel Cycle.', '/connect');
  `);
  console.log("✅ 3 notifications inserted");
} catch (err) {
  console.error("❌", err.message); process.exit(1);
} finally {
  await sql.end();
}
