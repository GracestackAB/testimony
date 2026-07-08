-- Bibel-krönika co-op: delat äventyr med växlande turer

alter table testimony.bible_adventure_saves
  add column if not exists partner_id uuid references auth.users (id) on delete set null,
  add column if not exists coop_status text not null default 'solo'
    check (coop_status in ('solo', 'active', 'ended')),
  add column if not exists active_turn_user_id uuid references auth.users (id) on delete set null;

create index if not exists bible_adventure_saves_partner_idx
  on testimony.bible_adventure_saves (partner_id, updated_at desc)
  where partner_id is not null;

create table if not exists testimony.bible_adventure_coop_invites (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references testimony.bible_adventure_saves (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint bible_adventure_coop_invites_not_self check (host_id <> partner_id),
  constraint bible_adventure_coop_invites_save_unique unique (save_id)
);

create index if not exists bible_adventure_coop_invites_partner_idx
  on testimony.bible_adventure_coop_invites (partner_id, status, created_at desc);

alter table testimony.bible_adventure_coop_invites enable row level security;

drop policy if exists bible_adventure_coop_invites_access on testimony.bible_adventure_coop_invites;
create policy bible_adventure_coop_invites_access on testimony.bible_adventure_coop_invites
  for all to authenticated
  using (host_id = auth.uid() or partner_id = auth.uid())
  with check (host_id = auth.uid() or partner_id = auth.uid());

drop policy if exists bible_adventure_saves_self on testimony.bible_adventure_saves;
create policy bible_adventure_saves_access on testimony.bible_adventure_saves
  for all to authenticated
  using (user_id = auth.uid() or partner_id = auth.uid())
  with check (user_id = auth.uid() or partner_id = auth.uid());

grant select, insert, update, delete on testimony.bible_adventure_coop_invites to authenticated, service_role;
