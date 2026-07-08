-- Bibel-krönika: sparade äventyr med inventarie och tillstånd (JSON)

create table if not exists testimony.bible_adventure_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  title text not null,
  scenario_id text not null,
  locale text not null check (locale in ('sv', 'en')),
  state jsonb not null,
  turn_count int not null default 0 check (turn_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bible_adventure_saves_user_slot unique (user_id, slot)
);

create index if not exists bible_adventure_saves_user_updated_idx
  on testimony.bible_adventure_saves (user_id, updated_at desc);

alter table testimony.bible_adventure_saves enable row level security;

drop policy if exists bible_adventure_saves_self on testimony.bible_adventure_saves;
create policy bible_adventure_saves_self on testimony.bible_adventure_saves
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on testimony.bible_adventure_saves to authenticated, service_role;
