-- testimony.se · globalt nätverk (LinkedIn + community-följning)
-- Rubrik, tjänstfokus, följare

alter table testimony.profiles
  add column if not exists headline text,
  add column if not exists ministry_focus text,
  add column if not exists open_to_connect boolean not null default false,
  add column if not exists open_to_serve boolean not null default false,
  add column if not exists preferred_locale text not null default 'sv'
    check (preferred_locale in ('sv', 'en'));

alter table testimony.profiles
  drop constraint if exists profiles_headline_length;
alter table testimony.profiles
  add constraint profiles_headline_length
    check (headline is null or char_length(headline) <= 120);

alter table testimony.profiles
  drop constraint if exists profiles_ministry_focus_length;
alter table testimony.profiles
  add constraint profiles_ministry_focus_length
    check (ministry_focus is null or char_length(ministry_focus) <= 200);

-- Följ andra profiler (community-flöde, framtida personaliserat feed)
create table if not exists testimony.profile_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_not_self check (follower_id <> following_id)
);

create index if not exists profile_follows_following_idx
  on testimony.profile_follows(following_id);

alter table testimony.profile_follows enable row level security;

drop policy if exists profile_follows_select on testimony.profile_follows;
create policy profile_follows_select on testimony.profile_follows
  for select to authenticated
  using (true);

drop policy if exists profile_follows_insert on testimony.profile_follows;
create policy profile_follows_insert on testimony.profile_follows
  for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists profile_follows_delete on testimony.profile_follows;
create policy profile_follows_delete on testimony.profile_follows
  for delete to authenticated
  using (follower_id = auth.uid());

grant select, insert, delete on testimony.profile_follows to authenticated;

-- Uppdatera publik vy (drop krävs vid ny kolumnordning)
drop view if exists testimony.public_profiles;
create view testimony.public_profiles as
select
  p.id,
  case when p.is_anonymized then 'Anonym användare' else p.display_name end as display_name,
  case when p.is_anonymized then null else p.username::text end as username,
  case when p.is_anonymized then null else p.avatar_url end as avatar_url,
  case
    when p.is_anonymized then null
    else p.headline
  end as headline,
  case
    when p.is_anonymized then null
    when (p.field_visibility->>'bio') = 'public' then p.bio
    else null
  end as bio,
  case
    when p.is_anonymized then null
    when (p.field_visibility->>'city') = 'public' then p.city
    else null
  end as city,
  case
    when p.is_anonymized then null
    when (p.field_visibility->>'church') = 'public' then p.church
    else null
  end as church,
  case
    when p.is_anonymized then null
    when (p.field_visibility->>'denomination') = 'public'
         and p.consent_special_category_at is not null
    then p.denomination
    else null
  end as denomination,
  case
    when p.is_anonymized then null
    when (p.field_visibility->>'role_in_church') = 'public' then p.role_in_church
    else null
  end as role_in_church,
  case
    when p.is_anonymized then null
    else p.ministry_focus
  end as ministry_focus,
  case when p.is_anonymized then false else p.open_to_connect end as open_to_connect,
  case when p.is_anonymized then false else p.open_to_serve end as open_to_serve,
  case
    when p.is_anonymized then null
    when (p.field_visibility->>'favorite_verse') = 'public' then p.favorite_verse
    else null
  end as favorite_verse,
  p.created_at,
  p.is_anonymized
from testimony.profiles p
where p.profile_visibility = 'public'
  and p.deleted_at is null;

grant select on testimony.public_profiles to anon, authenticated;

-- Antal följare per profil (publik)
create or replace function testimony.profile_follower_count(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = testimony, public
as $$
  select count(*)::bigint from testimony.profile_follows where following_id = p_user_id;
$$;

grant execute on function testimony.profile_follower_count(uuid) to anon, authenticated;
