-- testimony.se · Bibeltext-engagemang
-- Reaktioner (gilla/hjärta/amen) + kommentarer på dagens bibeltext

set search_path = testimony, public;

-- Utöka enums
alter type testimony.content_kind add value if not exists 'daily_bible';
alter type testimony.reaction_kind add value if not exists 'heart';
alter type testimony.reaction_kind add value if not exists 'amen';

-- ============================================================
-- Reaktioner: säkerställ unique + RLS
-- ============================================================
create unique index if not exists reactions_unique_user_kind
  on testimony.reactions(content_kind, content_id, user_id, kind)
  where user_id is not null;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='testimony' and tablename='reactions' and policyname='reactions_public_read') then
    execute 'create policy reactions_public_read on testimony.reactions for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where schemaname='testimony' and tablename='reactions' and policyname='reactions_self_insert') then
    execute 'create policy reactions_self_insert on testimony.reactions for insert with check (auth.uid() = user_id)';
  end if;
  if not exists (select 1 from pg_policies where schemaname='testimony' and tablename='reactions' and policyname='reactions_self_delete') then
    execute 'create policy reactions_self_delete on testimony.reactions for delete using (auth.uid() = user_id)';
  end if;
end$$;

create or replace function testimony.get_reaction_counts(p_kind testimony.content_kind, p_id uuid)
returns jsonb
language sql stable security definer
set search_path = testimony, public
as $$
  select coalesce(jsonb_object_agg(kind, c), '{}'::jsonb) from (
    select kind::text, count(*)::int as c
    from testimony.reactions
    where content_kind = p_kind and content_id = p_id
    group by kind
  ) sub;
$$;
grant execute on function testimony.get_reaction_counts(testimony.content_kind, uuid) to anon, authenticated;

-- ============================================================
-- Kommentarer på dagens bibeltext
-- ============================================================
create table if not exists testimony.bible_comments (
  id uuid primary key default gen_random_uuid(),
  daily_bible_id uuid not null references testimony.daily_bible(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint bible_comments_body_length check (char_length(body) between 1 and 2000)
);

create index if not exists bible_comments_daily_idx
  on testimony.bible_comments(daily_bible_id, created_at desc)
  where deleted_at is null;
create index if not exists bible_comments_author_idx
  on testimony.bible_comments(author_id, created_at desc);

alter table testimony.bible_comments enable row level security;

drop policy if exists bible_comments_public_read on testimony.bible_comments;
create policy bible_comments_public_read on testimony.bible_comments
  for select using (deleted_at is null);

drop policy if exists bible_comments_self_insert on testimony.bible_comments;
create policy bible_comments_self_insert on testimony.bible_comments
  for insert with check (auth.uid() = author_id);

drop policy if exists bible_comments_self_update on testimony.bible_comments;
create policy bible_comments_self_update on testimony.bible_comments
  for update using (auth.uid() = author_id or coalesce(testimony.is_moderator(auth.uid()), false))
  with check (auth.uid() = author_id or coalesce(testimony.is_moderator(auth.uid()), false));

drop policy if exists bible_comments_self_delete on testimony.bible_comments;
create policy bible_comments_self_delete on testimony.bible_comments
  for delete using (auth.uid() = author_id or coalesce(testimony.is_moderator(auth.uid()), false));

-- Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table testimony.bible_comments';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table testimony.reactions';
    exception when duplicate_object then null; end;
  end if;
end$$;
