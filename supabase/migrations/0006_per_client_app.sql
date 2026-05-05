-- ============================================================
-- 0006_per_client_app.sql — Caminho B: cada cliente cria o próprio app Meta
-- ============================================================
-- Ao invés de TODOS os clientes usarem nosso app único (que tem limite de 100
-- testers em modo Development), cada cliente cria o app dele no
-- developers.facebook.com e nos dá:
--   - App ID
--   - App Secret  (criptografado em rest)
--   - System User Token (criptografado em rest)
--   - Business Manager ID
--
-- Isso elimina o limite e nos tira do caminho do App Review.
--
-- Conexões antigas (sem app_id/app_secret) continuam funcionando via fallback
-- pro META_APP_SECRET do env (nosso app original).

alter table public.meta_connections
  add column if not exists app_id                  text,
  add column if not exists app_secret_ciphertext   text;

-- Não é UNIQUE — múltiplos clientes podem criar apps diferentes,
-- mesmo na mesma conta de desenvolvedor (em teoria).
create index if not exists meta_connections_app_id_idx
  on public.meta_connections(app_id) where app_id is not null;
