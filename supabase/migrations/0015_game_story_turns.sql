-- AI text adventure game — rate limiting per user
create table if not exists testimony.game_story_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists game_story_turns_user_created_idx
  on testimony.game_story_turns (user_id, created_at desc);

alter table testimony.game_story_turns enable row level security;

drop policy if exists game_story_turns_self_read on testimony.game_story_turns;
create policy game_story_turns_self_read on testimony.game_story_turns
  for select using (auth.uid() = user_id);

grant select, insert on testimony.game_story_turns to authenticated, service_role;
