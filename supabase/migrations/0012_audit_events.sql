-- =====================================================================
-- 0012_audit_events.sql — Backoffice próprio
-- Replace pra Sentry. Eventos de erro/warning/info gravados aqui.
-- Visualizado em /admin (acesso só pra emails na lista ADMIN_EMAILS).
-- =====================================================================

create table public.audit_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  severity    text not null check (severity in ('info', 'warning', 'error')),
  area        text not null,                  -- 'webhook' | 'cron-rules' | 'cron-alerts' | 'meta-sync' | 'resolver' | 'api'
  message     text not null,
  user_id     uuid references auth.users(id) on delete set null,
  tags        jsonb not null default '{}'::jsonb,
  extra       jsonb not null default '{}'::jsonb,
  stack       text
);

create index audit_created_idx  on public.audit_events(created_at desc);
create index audit_severity_idx on public.audit_events(severity, created_at desc);
create index audit_area_idx     on public.audit_events(area, created_at desc);
create index audit_user_idx     on public.audit_events(user_id, created_at desc) where user_id is not null;

-- RLS: usuários comuns NÃO leem nada. /admin usa service_role pra ler.
alter table public.audit_events enable row level security;
-- Sem policies = bloqueado pra anon/authenticated. Só service_role acessa.

NOTIFY pgrst, 'reload schema';
