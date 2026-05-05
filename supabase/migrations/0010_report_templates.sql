-- Templates de relatório — flag na mesma tabela `reports`.
alter table public.reports add column if not exists is_template boolean not null default false;
create index if not exists reports_template_idx on public.reports(user_id, is_template) where is_template = true;
NOTIFY pgrst, 'reload schema';
