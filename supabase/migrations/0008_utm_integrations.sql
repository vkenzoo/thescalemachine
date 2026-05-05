-- ============================================================
-- 0008_utm_integrations.sql — Integrações UTM (Hotmart, Kiwify, Hubla, Assiny)
-- ============================================================
-- Extende a página /integracoes (hoje 100% mock) pra:
--   - Persistir projetos UTM por usuário
--   - Receber webhooks dos gateways e gravar vendas
--   - Resolver atribuição UTM contra campaigns/adsets/ads existentes
-- ============================================================

-- ------------------------------------------------------------
-- utm_projects — 1 row por integração (gateway + ad_account)
-- ------------------------------------------------------------
create table public.utm_projects (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  name                     text not null,
  platform                 text not null check (platform in ('hotmart','kiwify','hubla','assiny')),
  ad_account_id            uuid references public.ad_accounts(id) on delete set null,

  webhook_token            uuid not null unique default gen_random_uuid(),
  signing_secret_ciphertext text,                 -- HMAC/Hottok criptografado

  -- Flags de setup do checklist da UI
  script_installed         boolean not null default false,
  utms_configured          boolean not null default false,
  webhook_configured       boolean not null default false,

  last_event_at            timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index utm_projects_user_idx ON public.utm_projects(user_id);
create index utm_projects_token_idx ON public.utm_projects(webhook_token);

alter table public.utm_projects enable row level security;
create policy "users manage own utm_projects" on public.utm_projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- utm_sales_raw — vendas cruas vindas do gateway
-- ------------------------------------------------------------
create table public.utm_sales_raw (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  project_id                  uuid not null references public.utm_projects(id) on delete cascade,
  gateway                     text not null,
  event_type                  text not null,
  external_transaction_id     text not null,
  external_event_id           text,
  occurred_at                 timestamptz not null,
  received_at                 timestamptz not null default now(),
  status                      text,

  gross_value_cents           bigint,
  net_value_cents             bigint,
  fee_cents                   bigint,
  currency                    text,

  utm_source                  text,
  utm_medium                  text,
  utm_campaign                text,
  utm_content                 text,
  utm_term                    text,
  utm_id                      text,
  src                         text,
  sck                         text,
  xcode                       text,

  external_product_id         text,
  product_name                text,

  buyer_email_hash            text,
  buyer_country               text,

  raw                         jsonb not null,

  unique (project_id, external_event_id)
);

create index utm_sales_user_occ_idx on public.utm_sales_raw(user_id, occurred_at desc);
create index utm_sales_project_idx on public.utm_sales_raw(project_id, occurred_at desc);
create index utm_sales_utm_idx on public.utm_sales_raw(utm_campaign, utm_content, utm_term);
create index utm_sales_tx_idx on public.utm_sales_raw(external_transaction_id);

alter table public.utm_sales_raw enable row level security;
create policy "users read own utm_sales" on public.utm_sales_raw for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- utm_sales_attribution — resultado do resolver (1 por venda)
-- ------------------------------------------------------------
create table public.utm_sales_attribution (
  id                       uuid primary key default gen_random_uuid(),
  sale_id                  uuid not null unique references public.utm_sales_raw(id) on delete cascade,
  user_id                  uuid not null references auth.users(id) on delete cascade,

  matched                  boolean not null default false,
  match_method             text,   -- 'utm_id','utm_term_ad_id','triple_utm','utm_campaign_only','fuzzy_campaign_name','direct'
  match_confidence         numeric(3,2),

  ad_id                    uuid references public.ads(id) on delete set null,
  adset_id                 uuid references public.adsets(id) on delete set null,
  campaign_id              uuid references public.campaigns(id) on delete set null,
  ad_account_id            uuid references public.ad_accounts(id) on delete set null,

  attribution_model        text not null default 'last_click',
  attribution_window_days  int not null default 7,
  attributed_at            timestamptz not null default now(),

  is_active                boolean not null default true,
  inactive_reason          text,
  inactive_at              timestamptz
);

create index utm_attr_user_idx on public.utm_sales_attribution(user_id, attributed_at desc);
create index utm_attr_ad_active_idx on public.utm_sales_attribution(ad_id, is_active);
create index utm_attr_campaign_active_idx on public.utm_sales_attribution(campaign_id, is_active);

alter table public.utm_sales_attribution enable row level security;
create policy "users read own utm_attribution" on public.utm_sales_attribution for select
  using (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
