-- ============================================================
-- 0001_init.sql — Auth, profiles, billing
-- ============================================================
-- Schema base do app: profile do usuário, planos, assinaturas.
-- RLS habilitada em tudo. Policies usam auth.uid() do Supabase.

-- ------------------------------------------------------------
-- profiles: dados do usuário 1:1 com auth.users
-- ------------------------------------------------------------
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  phone        text,
  locale       text default 'pt-BR' not null,
  theme        text default 'light' check (theme in ('light', 'dark')),
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- Cada user lê e atualiza só seu próprio profile.
create policy "users see own profile"   on public.profiles for select using (auth.uid() = user_id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = user_id);

-- Insert geralmente acontece via trigger (handle_new_user) — service_role bypassa RLS,
-- mas adicionamos policy pra fluxo onboarding manual também.
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- plans: catálogo dos 4 planos (seed estático)
-- ------------------------------------------------------------
create table public.plans (
  id                    text primary key,    -- 'starter', 'pro', 'business', 'enterprise'
  name                  text not null,
  price_cents_monthly   int not null,
  price_cents_yearly    int not null,        -- já com 17% de desconto aplicado
  max_accounts          int,                 -- null = ilimitado
  max_rules             int,
  max_users             int,
  features              jsonb default '[]'::jsonb not null,
  created_at            timestamptz default now() not null
);

-- Plans é leitura pública (mostrado em /billing)
alter table public.plans enable row level security;
create policy "plans public read" on public.plans for select using (true);

insert into public.plans (id, name, price_cents_monthly, price_cents_yearly, max_accounts, max_rules, max_users, features) values
  ('starter',    'Starter',     9700,   97000,   3,    null, 1,    '["Gerenciador Meta Ads completo","Editor de anúncios em massa","Relatórios básicos","Suporte por e-mail"]'::jsonb),
  ('pro',        'Pro',        19700,  196200,  10,   10,   3,    '["Tudo do Starter","Relatórios compartilháveis white-label","Criar Públicos","Regras Automatizadas (até 10)","Integrações UTMs","Central de contas","Suporte por chat"]'::jsonb),
  ('business',   'Business',   39700,  395600,  30,   null, null, '["Tudo do Pro","Regras ilimitadas","Escala de Orçamento automática com IA","Suporte prioritário"]'::jsonb),
  ('enterprise', 'Enterprise', 79700,  794400,  null, null, null, '["Tudo do Business","API Access","Onboarding dedicado","SLA de suporte","Customizações sob demanda"]'::jsonb);

-- ------------------------------------------------------------
-- subscriptions: assinatura ativa do user (1:1 ativo, mas histórico)
-- ------------------------------------------------------------
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  plan_id                text not null references public.plans(id),
  status                 text not null check (status in ('trialing','active','past_due','canceled','expired')),
  trial_ends_at          timestamptz,
  current_period_start   timestamptz default now() not null,
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  asaas_subscription_id  text,                -- Fase 6 quando integrar Asaas
  created_at             timestamptz default now() not null,
  updated_at             timestamptz default now() not null
);

create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_status_idx  on public.subscriptions(status) where status in ('trialing','active');

alter table public.subscriptions enable row level security;
create policy "users see own subs" on public.subscriptions for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Trigger: ao criar usuário, cria profile + subscription starter ativa
-- (sem trial — cobramos direto, plano starter como fallback)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  );

  insert into public.subscriptions (user_id, plan_id, status, current_period_end)
  values (
    new.id,
    'starter',
    'active',
    now() + interval '30 days'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- Trigger: updated_at automático
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at      before update on public.profiles      for each row execute procedure public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();
