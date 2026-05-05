-- ============================================================
-- 0003_campaigns.sql — Estrutura de campanhas + cache local
-- ============================================================
-- Espelhamos campanhas/conjuntos/anúncios localmente pra UI ser rápida.
-- Sync em background (Edge Function ou refresh manual via "Atualizar").

-- ------------------------------------------------------------
-- campaigns
-- ------------------------------------------------------------
create table public.campaigns (
  id                       uuid primary key default gen_random_uuid(),
  ad_account_id            uuid not null references public.ad_accounts(id) on delete cascade,
  user_id                  uuid not null references auth.users(id) on delete cascade,
  meta_id                  text not null,                     -- ID na Meta (ex: '120211000...')
  name                     text not null,
  objective                text,                              -- OUTCOME_SALES, OUTCOME_LEADS, etc
  status                   text not null check (status in ('ACTIVE','PAUSED','DELETED','ARCHIVED','WITH_ISSUES','UNDEFINED')),
  budget_type              text check (budget_type in ('ABO','CBO')),
  daily_budget_cents       bigint,
  lifetime_budget_cents    bigint,
  spend_cap_cents          bigint,
  created_time             timestamptz,
  updated_time             timestamptz,
  raw                      jsonb,                             -- payload original pro debug
  last_synced_at           timestamptz default now() not null,

  unique (ad_account_id, meta_id)
);

create index campaigns_account_idx on public.campaigns(ad_account_id);
create index campaigns_user_id_idx on public.campaigns(user_id);
create index campaigns_status_idx  on public.campaigns(status) where status = 'ACTIVE';

alter table public.campaigns enable row level security;
create policy "users see own campaigns"   on public.campaigns for select using (auth.uid() = user_id);
create policy "users insert own campaigns" on public.campaigns for insert with check (auth.uid() = user_id);
create policy "users update own campaigns" on public.campaigns for update using (auth.uid() = user_id);
create policy "users delete own campaigns" on public.campaigns for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- adsets
-- ------------------------------------------------------------
create table public.adsets (
  id                     uuid primary key default gen_random_uuid(),
  campaign_id            uuid not null references public.campaigns(id) on delete cascade,
  user_id                uuid not null references auth.users(id) on delete cascade,
  meta_id                text not null,
  name                   text not null,
  status                 text not null,
  daily_budget_cents     bigint,
  lifetime_budget_cents  bigint,
  targeting              jsonb,
  created_time           timestamptz,
  updated_time           timestamptz,
  raw                    jsonb,
  last_synced_at         timestamptz default now() not null,

  unique (campaign_id, meta_id)
);

create index adsets_campaign_id_idx on public.adsets(campaign_id);
create index adsets_user_id_idx     on public.adsets(user_id);

alter table public.adsets enable row level security;
create policy "users manage own adsets" on public.adsets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- ads
-- ------------------------------------------------------------
create table public.ads (
  id              uuid primary key default gen_random_uuid(),
  adset_id        uuid not null references public.adsets(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  meta_id         text not null,
  name            text not null,
  status          text not null,
  creative_id     text,
  preview_url     text,
  created_time    timestamptz,
  raw             jsonb,
  last_synced_at  timestamptz default now() not null,

  unique (adset_id, meta_id)
);

create index ads_adset_id_idx on public.ads(adset_id);
create index ads_user_id_idx  on public.ads(user_id);

alter table public.ads enable row level security;
create policy "users manage own ads" on public.ads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- campaign_insights: métricas por dia (cache de insights da Graph API)
-- ------------------------------------------------------------
-- Insights são caros de buscar — cacheamos por (campaign, date_start, date_stop)
-- pra não bater a Graph API a cada page load.
create table public.campaign_insights (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.campaigns(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  date_start          date not null,
  date_stop           date not null,
  spend_cents         bigint default 0,
  impressions         bigint default 0,
  reach               bigint default 0,
  clicks              bigint default 0,
  ctr                 numeric(8,6),     -- 0..1
  cpc_cents           bigint,
  cpm_cents           bigint,
  frequency           numeric(8,4),
  -- Conversões: agregadas via actions[] da Meta
  purchases           int default 0,
  cpa_cents           bigint,
  revenue_cents       bigint default 0,
  roas                numeric(10,4),
  leads               int default 0,
  cpl_cents           bigint,
  messages            int default 0,
  cp_message_cents    bigint,
  ig_visits           int default 0,
  cp_ig_cents         bigint,
  raw                 jsonb,             -- payload completo do insights pra debug
  fetched_at          timestamptz default now() not null,

  unique (campaign_id, date_start, date_stop)
);

create index campaign_insights_user_id_idx       on public.campaign_insights(user_id);
create index campaign_insights_period_idx        on public.campaign_insights(date_start, date_stop);
create index campaign_insights_campaign_id_idx   on public.campaign_insights(campaign_id);

alter table public.campaign_insights enable row level security;
create policy "users see own insights" on public.campaign_insights for select using (auth.uid() = user_id);
create policy "users insert own insights" on public.campaign_insights for insert with check (auth.uid() = user_id);
create policy "users update own insights" on public.campaign_insights for update using (auth.uid() = user_id);
