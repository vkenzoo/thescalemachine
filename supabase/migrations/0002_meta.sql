-- ============================================================
-- 0002_meta.sql — Conexões com a Meta + ad accounts
-- ============================================================
-- Tokens criptografados em rest (AES-256-GCM via lib/crypto.ts).
-- Suporta tanto System User Token (MVP) quanto OAuth (futuro).

-- ------------------------------------------------------------
-- meta_connections: cada user pode ter N conexões (= N Business Managers)
-- ------------------------------------------------------------
create table public.meta_connections (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  connection_type            text not null check (connection_type in ('system_user', 'oauth')),
  fb_user_id                 text,                                    -- pode ser null em system_user genérico
  fb_user_name               text,
  business_manager_id        text not null,
  business_manager_name      text,
  access_token_ciphertext    text not null,                           -- base64(IV+TAG+CIPHER)
  granted_scopes             text[] default '{}'::text[] not null,
  expires_at                 timestamptz,                             -- null = vitalício (system_user)
  last_healthcheck_at        timestamptz,
  last_synced_at             timestamptz,
  status                     text not null default 'active' check (status in ('active','invalid','revoked')),
  created_at                 timestamptz default now() not null,
  updated_at                 timestamptz default now() not null,

  -- Um BM por user (não duplica conexão)
  unique (user_id, business_manager_id)
);

create index meta_connections_user_id_idx on public.meta_connections(user_id);
create index meta_connections_status_idx  on public.meta_connections(status) where status = 'active';

alter table public.meta_connections enable row level security;
create policy "users see own meta connections"   on public.meta_connections for select using (auth.uid() = user_id);
create policy "users insert own meta connections" on public.meta_connections for insert with check (auth.uid() = user_id);
create policy "users update own meta connections" on public.meta_connections for update using (auth.uid() = user_id);
create policy "users delete own meta connections" on public.meta_connections for delete using (auth.uid() = user_id);

create trigger meta_connections_updated_at before update on public.meta_connections for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- ad_accounts: contas de anúncio espelhadas localmente
-- ------------------------------------------------------------
create table public.ad_accounts (
  id                       uuid primary key default gen_random_uuid(),
  connection_id            uuid not null references public.meta_connections(id) on delete cascade,
  user_id                  uuid not null references auth.users(id) on delete cascade,    -- denormaliza pra RLS rápida
  account_id               text not null,                          -- 'act_123456789'
  name                     text not null,
  currency                 text not null,
  timezone_name            text,
  account_status           int default 1 not null,                  -- 1 = active, 2 = disabled
  balance_cents            bigint default 0 not null,
  amount_spent_cents       bigint default 0 not null,
  disable_reason           int,
  last_synced_at           timestamptz default now() not null,
  created_at               timestamptz default now() not null,
  updated_at               timestamptz default now() not null,

  unique (connection_id, account_id)
);

create index ad_accounts_user_id_idx       on public.ad_accounts(user_id);
create index ad_accounts_connection_id_idx on public.ad_accounts(connection_id);

alter table public.ad_accounts enable row level security;
create policy "users see own ad accounts"   on public.ad_accounts for select using (auth.uid() = user_id);
create policy "users insert own ad accounts" on public.ad_accounts for insert with check (auth.uid() = user_id);
create policy "users update own ad accounts" on public.ad_accounts for update using (auth.uid() = user_id);
create policy "users delete own ad accounts" on public.ad_accounts for delete using (auth.uid() = user_id);

create trigger ad_accounts_updated_at before update on public.ad_accounts for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- account_notes: anotações livres por conta
-- ------------------------------------------------------------
create table public.account_notes (
  ad_account_id  uuid primary key references public.ad_accounts(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  note           text default '' not null,
  updated_at     timestamptz default now() not null
);

alter table public.account_notes enable row level security;
create policy "users manage own notes" on public.account_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger account_notes_updated_at before update on public.account_notes for each row execute procedure public.set_updated_at();
