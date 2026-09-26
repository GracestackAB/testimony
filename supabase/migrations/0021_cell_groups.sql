-- testimony.se · Privata cellgrupper med inbjudningslänkar
-- Medlemmar ser bara sina egna grupper (RLS). Server actions använder service role.

create table if not exists testimony.cell_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  meeting_info text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cell_groups_created_by_idx on testimony.cell_groups (created_by);

create table if not exists testimony.cell_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references testimony.cell_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists cell_group_members_user_idx on testimony.cell_group_members (user_id);

create table if not exists testimony.cell_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references testimony.cell_groups(id) on delete cascade,
  token text unique not null,
  role text not null default 'member' check (role in ('leader', 'member')),
  expires_at timestamptz,
  max_uses int,
  uses int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cell_group_invites_group_idx on testimony.cell_group_invites (group_id);

create table if not exists testimony.cell_group_invite_uses (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references testimony.cell_group_invites(id) on delete cascade,
  accepted_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS
alter table testimony.cell_groups enable row level security;
alter table testimony.cell_group_members enable row level security;
alter table testimony.cell_group_invites enable row level security;
alter table testimony.cell_group_invite_uses enable row level security;

drop policy if exists cell_groups_member_select on testimony.cell_groups;
create policy cell_groups_member_select on testimony.cell_groups
  for select using (
    exists (
      select 1 from testimony.cell_group_members m
      where m.group_id = id and m.user_id = auth.uid()
    )
  );

drop policy if exists cell_groups_leader_update on testimony.cell_groups;
create policy cell_groups_leader_update on testimony.cell_groups
  for update using (
    exists (
      select 1 from testimony.cell_group_members m
      where m.group_id = id and m.user_id = auth.uid() and m.role = 'leader'
    )
  );

drop policy if exists cell_group_members_select on testimony.cell_group_members;
create policy cell_group_members_select on testimony.cell_group_members
  for select using (
    exists (
      select 1 from testimony.cell_group_members m
      where m.group_id = group_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on testimony.cell_groups to authenticated, service_role;
grant select, insert, update, delete on testimony.cell_group_members to authenticated, service_role;
grant select, insert, update, delete on testimony.cell_group_invites to service_role;
grant select, insert on testimony.cell_group_invite_uses to service_role;
