-- ============================================================
-- 0004_meta_extras.sql — Tabelas adicionais Meta
-- ============================================================
-- meta_pages, meta_pixels, meta_audiences, meta_videos
-- + colunas extras em campaigns/ads pra cobrir todo o produto.

-- ------------------------------------------------------------
-- meta_pages: páginas FB do user (necessárias pra criar anúncios)
-- ------------------------------------------------------------
create table public.meta_pages (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  connection_id            uuid references public.meta_connections(id) on delete cascade,
  page_id                  text not null,
  name                     text not null,
  category                 text,
  ig_account_id            text,                          -- IG Business conectada
  ig_username              text,
  page_access_token_ciphertext text,                      -- alguns endpoints exigem (encrypted)
  last_synced_at           timestamptz default now() not null,
  created_at               timestamptz default now() not null,
  unique (user_id, page_id)
);

create index meta_pages_user_id_idx on public.meta_pages(user_id);
alter table public.meta_pages enable row level security;
create policy "users manage own pages" on public.meta_pages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- meta_pixels: pixels da conta (pra audiences)
-- ------------------------------------------------------------
create table public.meta_pixels (
  id              uuid primary key default gen_random_uuid(),
  ad_account_id   uuid not null references public.ad_accounts(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  pixel_id        text not null,
  name            text not null,
  events_summary  jsonb default '{}'::jsonb not null,    -- { "Purchase": 43, "Lead": 3637 }
  last_synced_at  timestamptz default now() not null,
  unique (ad_account_id, pixel_id)
);

create index meta_pixels_user_id_idx on public.meta_pixels(user_id);
alter table public.meta_pixels enable row level security;
create policy "users manage own pixels" on public.meta_pixels for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- meta_audiences: cache local dos custom audiences + lookalikes
-- ------------------------------------------------------------
create table public.meta_audiences (
  id                  uuid primary key default gen_random_uuid(),
  ad_account_id       uuid not null references public.ad_accounts(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  meta_id             text not null,
  name                text not null,
  subtype             text,                              -- CUSTOM, LOOKALIKE, WEBSITE, ENGAGEMENT
  source_audience_id  text,                              -- pra LOOKALIKE
  approximate_count   bigint,
  retention_days      int,
  delivery_status     text,                              -- code: 200=ready, 300=building, 400=invalid
  delivery_status_desc text,
  raw                 jsonb,
  last_synced_at      timestamptz default now() not null,
  created_at          timestamptz default now() not null,
  unique (ad_account_id, meta_id)
);

create index meta_audiences_user_id_idx on public.meta_audiences(user_id);
create index meta_audiences_subtype_idx on public.meta_audiences(subtype);
alter table public.meta_audiences enable row level security;
create policy "users manage own audiences" on public.meta_audiences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- meta_videos: vídeos da conta (cache pra mostrar no Editor)
-- ------------------------------------------------------------
create table public.meta_videos (
  id              uuid primary key default gen_random_uuid(),
  ad_account_id   uuid not null references public.ad_accounts(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  meta_video_id   text not null,
  name            text,
  thumbnail_url   text,
  duration_ms     int,
  status          text,                                  -- ready, processing, error
  uploaded_at     timestamptz,
  raw             jsonb,
  last_synced_at  timestamptz default now() not null,
  unique (ad_account_id, meta_video_id)
);

create index meta_videos_user_id_idx on public.meta_videos(user_id);
alter table public.meta_videos enable row level security;
create policy "users manage own videos" on public.meta_videos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Colunas extras em campaigns
-- ------------------------------------------------------------
alter table public.campaigns
  add column if not exists buying_type text,
  add column if not exists bid_strategy text,
  add column if not exists special_ad_categories text[],
  add column if not exists start_time timestamptz,
  add column if not exists stop_time timestamptz,
  add column if not exists effective_status text;

-- ------------------------------------------------------------
-- Colunas extras em ads
-- ------------------------------------------------------------
alter table public.ads
  add column if not exists thumbnail_url text,
  add column if not exists effective_status text,
  add column if not exists object_story_spec jsonb;

-- ------------------------------------------------------------
-- upload_jobs: fila do Editor (pra rodar via Coolify worker)
-- ------------------------------------------------------------
create table public.upload_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  ad_account_id   uuid not null references public.ad_accounts(id) on delete cascade,
  payload         jsonb not null,                        -- spec completo do anúncio
  status          text not null default 'queued' check (status in ('queued','running','done','failed','cancelled')),
  progress_total  int default 100,
  progress_done   int default 0,
  error_text      text,
  meta_ad_id      text,                                  -- preenchido após sucesso
  created_at      timestamptz default now() not null,
  started_at      timestamptz,
  finished_at     timestamptz
);

create index upload_jobs_user_idx on public.upload_jobs(user_id);
create index upload_jobs_status_idx on public.upload_jobs(status) where status in ('queued','running');

alter table public.upload_jobs enable row level security;
create policy "users see own jobs"   on public.upload_jobs for select using (auth.uid() = user_id);
create policy "users insert own jobs" on public.upload_jobs for insert with check (auth.uid() = user_id);
create policy "users update own jobs" on public.upload_jobs for update using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- notifications: sino do header
-- ------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tone        text not null check (tone in ('info','warning','danger','success')),
  title       text not null,
  description text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz default now() not null
);

create index notifications_user_idx on public.notifications(user_id, read_at);

alter table public.notifications enable row level security;
create policy "users see own notifications"   on public.notifications for select using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications for update using (auth.uid() = user_id);
