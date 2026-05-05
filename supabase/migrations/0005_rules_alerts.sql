-- ============================================================
-- 0005_rules_alerts.sql — Regras Automatizadas + Alertas de Métricas
-- ============================================================
-- Regras executam ações em campanhas/conjuntos/anúncios quando
-- condições são atingidas. Alertas só notificam (sino + email).
--
-- A execução real (cron + worker) fica pra fase 5 do PLANO.md.
-- Por enquanto, persistimos config e expomos manual "test-fire".

-- ------------------------------------------------------------
-- rules
-- ------------------------------------------------------------
create table public.rules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,

  -- Escopo
  accounts_filter   text[] default '{}'::text[] not null,   -- vazio = todas as contas
  scope             text not null,                          -- "Campanhas Ativas", etc — string livre por agora
  name_filter_op    text default 'any' not null,            -- 'any', 'contains', 'not_contains', 'starts_with'
  name_filter_text  text default '' not null,

  -- Ação
  action            text not null,                          -- 'pause' | 'activate' | 'increase_budget' | 'decrease_budget' | 'set_budget'
  action_value      numeric(12,2),                          -- valor numérico opcional (% ou R$)
  action_unit       text default 'pct' not null,            -- 'pct' | 'abs'

  -- Condições (jsonb pra flexibilidade)
  conditions        jsonb default '[]'::jsonb not null,     -- [{ metric, op, value }, ...]

  -- Programação
  period            text default 'last_7d' not null,        -- 'today', 'yesterday', 'last_3d', 'last_7d_inc', 'last_7d_exc', 'last_14d', 'last_30d'
  schedule_mode     text default 'continuous' not null,     -- 'continuous' | 'specific_date' | 'custom'
  frequency         text default '30min' not null,          -- '10min', '15min', '30min', '1h', '2h', '3h', '6h', 'daily'
  interval_mode     text default 'any' not null,            -- 'any' | 'custom' (janela horária)
  daily_limit       int default null,                       -- null = sem limite, 1-8 senão

  -- Estado
  status            text not null default 'active' check (status in ('active', 'paused')),
  last_run_at       timestamptz,
  next_run_at       timestamptz,
  triggers_count    int default 0 not null,                 -- denormalizado pra UI

  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

create index rules_user_id_idx       on public.rules(user_id);
create index rules_next_run_at_idx   on public.rules(next_run_at) where status = 'active';

alter table public.rules enable row level security;
create policy "users see own rules"   on public.rules for select using (auth.uid() = user_id);
create policy "users insert own rules" on public.rules for insert with check (auth.uid() = user_id);
create policy "users update own rules" on public.rules for update using (auth.uid() = user_id);
create policy "users delete own rules" on public.rules for delete using (auth.uid() = user_id);

create trigger rules_updated_at before update on public.rules for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- rule_executions: histórico de execuções
-- ------------------------------------------------------------
create table public.rule_executions (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid not null references public.rules(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  executed_at   timestamptz default now() not null,
  target_type   text not null,                              -- 'campaign' | 'adset' | 'ad'
  target_id     text not null,                              -- meta_id
  target_name   text,
  before_json   jsonb,                                       -- snapshot do estado antes
  after_json    jsonb,                                       -- snapshot depois
  status        text not null check (status in ('success', 'skipped', 'failed')),
  error_message text
);

create index rule_executions_rule_id_idx     on public.rule_executions(rule_id);
create index rule_executions_user_id_idx     on public.rule_executions(user_id);
create index rule_executions_executed_at_idx on public.rule_executions(executed_at desc);

alter table public.rule_executions enable row level security;
create policy "users see own executions"   on public.rule_executions for select using (auth.uid() = user_id);
create policy "users insert own executions" on public.rule_executions for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- alerts
-- ------------------------------------------------------------
create table public.alerts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text default '' not null,             -- vazio = auto-gerar pelo conteúdo

  metric              text not null,                        -- 'cpa', 'cpc', 'cpm', 'ctr', 'spend', 'roas'
  op                  text not null check (op in ('gt', 'lt', 'eq', 'gte', 'lte')),
  value               numeric(14,4) not null,
  account_filter      text default 'all' not null,          -- 'all' | account_id (act_xxx)

  enabled             boolean default true not null,
  last_check_at       timestamptz,
  last_triggered_at   timestamptz,
  triggers_count      int default 0 not null,

  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

create index alerts_user_id_idx on public.alerts(user_id);
create index alerts_enabled_idx on public.alerts(enabled) where enabled = true;

alter table public.alerts enable row level security;
create policy "users see own alerts"   on public.alerts for select using (auth.uid() = user_id);
create policy "users insert own alerts" on public.alerts for insert with check (auth.uid() = user_id);
create policy "users update own alerts" on public.alerts for update using (auth.uid() = user_id);
create policy "users delete own alerts" on public.alerts for delete using (auth.uid() = user_id);

create trigger alerts_updated_at before update on public.alerts for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- alert_events: histórico de disparos
-- ------------------------------------------------------------
create table public.alert_events (
  id              uuid primary key default gen_random_uuid(),
  alert_id        uuid not null references public.alerts(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  triggered_at    timestamptz default now() not null,
  value_at_trigger numeric(14,4) not null,
  account_id      text,                                       -- conta específica que disparou
  campaign_id     text,                                       -- se aplicável
  notified_via    text[] default '{}'::text[] not null         -- 'in_app' | 'email'
);

create index alert_events_alert_id_idx     on public.alert_events(alert_id);
create index alert_events_user_id_idx      on public.alert_events(user_id);
create index alert_events_triggered_at_idx on public.alert_events(triggered_at desc);

alter table public.alert_events enable row level security;
create policy "users see own alert events"   on public.alert_events for select using (auth.uid() = user_id);
create policy "users insert own alert events" on public.alert_events for insert with check (auth.uid() = user_id);
