-- AI skrivhjälp: logg för rate limit (ingen råtext lagras)
create table if not exists testimony.ai_write_assists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('testimony', 'prayer_request', 'prayer_answer', 'gratitude')),
  created_at timestamptz not null default now()
);

create index if not exists ai_write_assists_user_created_idx
  on testimony.ai_write_assists (user_id, created_at desc);

alter table testimony.ai_write_assists enable row level security;

drop policy if exists ai_write_assists_self_read on testimony.ai_write_assists;
create policy ai_write_assists_self_read on testimony.ai_write_assists
  for select using (auth.uid() = user_id);

grant select, insert on testimony.ai_write_assists to authenticated, service_role;
