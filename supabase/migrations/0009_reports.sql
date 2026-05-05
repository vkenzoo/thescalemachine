-- ============================================================
-- 0009_reports.sql — Relatórios compartilháveis (white-label)
-- ============================================================

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  slug            text not null unique,                  -- pra /r/{slug}
  name            text not null,
  level           text not null default 'Campanhas',     -- Campanhas | Conjuntos | Anúncios
  accounts        text[] not null default '{}',          -- act_xxx ids
  ig_account      text,
  metrics         text[] not null default '{}',          -- métricas selecionadas
  sections        text[] not null default '{}',          -- funnel | perf | pie | topCamp | topAds
  funnel_steps    text[] not null default '{}',
  is_public       boolean not null default true,
  password_hash   text,                                  -- bcrypt/sha256, opcional
  views           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index reports_user_idx on public.reports(user_id, created_at desc);
create index reports_slug_idx on public.reports(slug);

alter table public.reports enable row level security;
create policy "users manage own reports" on public.reports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- /r/{slug} é público, então precisa de policy SELECT que aceita anon quando is_public=true
create policy "public reports readable by slug" on public.reports for select
  using (is_public = true);

-- RPC pra incrementar views (pra view pública, sem auth)
create or replace function public.increment_report_views(p_slug text)
returns int as $$
declare
  new_views int;
begin
  update public.reports
  set views = views + 1
  where slug = p_slug and is_public = true
  returning views into new_views;
  return new_views;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_report_views(text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
