-- ============================================================
-- 0007_user_preferences.sql — Presets de colunas + métricas + preferências
-- ============================================================
-- Persiste configurações que hoje vivem só em localStorage:
--  - column_presets: presets nomeados de colunas (ex: "Performance", "Leads")
--  - user_preferences: estado do user (colunas selecionadas, métricas, etc)

-- ------------------------------------------------------------
-- column_presets
-- ------------------------------------------------------------
create table public.column_presets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  cols        text[] not null default '{}'::text[],
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique (user_id, name)
);

create index column_presets_user_id_idx on public.column_presets(user_id);

alter table public.column_presets enable row level security;
create policy "users see own column presets"   on public.column_presets for select using (auth.uid() = user_id);
create policy "users insert own column presets" on public.column_presets for insert with check (auth.uid() = user_id);
create policy "users update own column presets" on public.column_presets for update using (auth.uid() = user_id);
create policy "users delete own column presets" on public.column_presets for delete using (auth.uid() = user_id);

create trigger column_presets_updated_at before update on public.column_presets for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- user_preferences — singleton por user
-- ------------------------------------------------------------
create table public.user_preferences (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  -- Colunas atualmente visíveis no Gerenciador (array de IDs)
  selected_columns     text[] default '{}'::text[] not null,
  -- ID do preset ativo (null = custom)
  active_preset_id     uuid references public.column_presets(id) on delete set null,
  -- Métricas selecionadas pros cards de Resumo do Período (até 12)
  selected_metrics     text[] default '{spend,revenue,roas,purchases,cpa,ctr}'::text[] not null,
  -- Privacy mode (oculta nomes)
  privacy_mode         boolean default false not null,
  updated_at           timestamptz default now() not null
);

alter table public.user_preferences enable row level security;
create policy "users manage own preferences" on public.user_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger user_preferences_updated_at before update on public.user_preferences for each row execute procedure public.set_updated_at();
