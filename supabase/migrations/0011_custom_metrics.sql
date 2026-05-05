-- ============================================================
-- 0011_custom_metrics.sql — Métricas personalizadas (fórmulas)
-- ============================================================

create table public.custom_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  key          text not null,                    -- 'cm_<slug>' usado como id da coluna
  label        text not null,                    -- nome exibido no header
  formula      text not null,                    -- ex: "(revenue - spend) / spend"
  format       text not null default 'number'    -- 'currency' | 'percent' | 'number' | 'ratio'
                check (format in ('currency','percent','number','ratio')),
  good_is_up   boolean not null default true,    -- pra colorização (verde se sobe)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, key)
);

create index custom_metrics_user_idx on public.custom_metrics(user_id);

alter table public.custom_metrics enable row level security;
create policy "users manage own custom_metrics" on public.custom_metrics for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
