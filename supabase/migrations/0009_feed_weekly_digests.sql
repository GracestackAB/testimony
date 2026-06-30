-- Veckosammanfattning av nätverksflöde (AI-cache per användare/vecka)
create table if not exists testimony.feed_weekly_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text not null,
  highlights jsonb not null default '[]',
  prayer_focus text,
  item_count int not null default 0,
  locale text not null default 'sv' check (locale in ('sv', 'en')),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists feed_weekly_digests_user_week_idx
  on testimony.feed_weekly_digests (user_id, week_start desc);

alter table testimony.feed_weekly_digests enable row level security;

drop policy if exists feed_weekly_digests_self_read on testimony.feed_weekly_digests;
create policy feed_weekly_digests_self_read on testimony.feed_weekly_digests
  for select using (auth.uid() = user_id);

grant select, insert, update on testimony.feed_weekly_digests to authenticated, service_role;
