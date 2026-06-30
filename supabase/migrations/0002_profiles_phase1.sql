-- testimony.se · profiler Fas 1
-- Utökar testimony.profiles, lägger till privacy + GDPR-spår.
-- Schema: testimony (inte public)

create extension if not exists "citext";

-- =========================================================
-- Reserverade användarnamn
-- =========================================================
create table if not exists testimony.reserved_usernames (
  username citext primary key,
  reason text not null default 'system',
  created_at timestamptz not null default now()
);

insert into testimony.reserved_usernames (username, reason) values
  ('admin','system'), ('administrator','system'), ('moderator','system'),
  ('mod','system'), ('root','system'), ('support','system'), ('hjalp','system'),
  ('hjälp','system'), ('kontakt','system'), ('redaktion','system'),
  ('testimony','brand'), ('vittnesbord','brand'), ('vittnesbörd','brand'),
  ('gracestack','brand'), ('kim','brand'), ('sofia','brand'),
  ('jesus','brand'), ('gud','brand'), ('herren','brand'), ('kristus','brand'),
  ('anonym','system'), ('borttagen','system'), ('raderad','system'),
  ('null','system'), ('undefined','system'), ('api','system'),
  ('auth','system'), ('konto','system'), ('login','system'),
  ('signup','system'), ('logout','system'), ('u','system'), ('user','system'),
  ('admin_','system'), ('system','system'), ('staff','system')
on conflict do nothing;

-- =========================================================
-- Username history
-- =========================================================
create table if not exists testimony.username_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  old_username citext not null,
  new_username citext,
  changed_at timestamptz not null default now(),
  released_at timestamptz not null default (now() + interval '90 days')
);
create index if not exists username_history_old_idx on testimony.username_history(old_username);
create index if not exists username_history_user_idx on testimony.username_history(user_id);

-- =========================================================
-- Utöka profiles
-- =========================================================
alter table testimony.profiles
  add column if not exists username citext,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists city text,
  add column if not exists denomination text,
  add column if not exists role_in_church text,
  add column if not exists believer_since date,
  add column if not exists favorite_verse text,
  add column if not exists church_id uuid references testimony.organizations(id) on delete set null,
  add column if not exists last_active_at timestamptz,
  add column if not exists username_changed_at timestamptz,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists profile_visibility text not null default 'public'
    check (profile_visibility in ('public','members_only','private')),
  add column if not exists field_visibility jsonb not null default jsonb_build_object(
    'church','public',
    'denomination','members_only',
    'role_in_church','members_only',
    'believer_since','private',
    'favorite_verse','public',
    'city','public',
    'bio','public'
  ),
  add column if not exists consent_special_category_at timestamptz,
  add column if not exists consent_special_category_version text,
  add column if not exists deleted_at timestamptz,
  add column if not exists is_anonymized boolean not null default false;

-- Unique på username (case-insensitive via citext)
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='testimony' and indexname='profiles_username_key'
  ) then
    create unique index profiles_username_key on testimony.profiles(username) where username is not null;
  end if;
end $$;

-- Constraints
alter table testimony.profiles
  drop constraint if exists profiles_username_format;
alter table testimony.profiles
  add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9][a-z0-9_-]{2,29}$');

alter table testimony.profiles
  drop constraint if exists profiles_denomination_valid;
alter table testimony.profiles
  add constraint profiles_denomination_valid
    check (denomination is null or denomination in (
      'pingst','efk','svenska_kyrkan','katolska','equmenia','baptist',
      'fralsningsarmen','adventist','ortodox','fri_oberoende','annan','vill_ej_ange'
    ));

alter table testimony.profiles
  drop constraint if exists profiles_role_valid;
alter table testimony.profiles
  add constraint profiles_role_valid
    check (role_in_church is null or role_in_church in (
      'medlem','ledare','pastor','ungdomsledare','volontar','besokare','annan'
    ));

alter table testimony.profiles
  drop constraint if exists profiles_bio_length;
alter table testimony.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 240);

-- =========================================================
-- Trigger: validera användarnamn (reserverade, cooldown, history)
-- =========================================================
create or replace function testimony.validate_username()
returns trigger language plpgsql as $$
begin
  if new.username is not null then
    new.username := lower(new.username::text)::citext;

    if exists (select 1 from testimony.reserved_usernames where username = new.username) then
      raise exception 'username_reserved' using errcode = '23514';
    end if;

    if tg_op = 'UPDATE'
       and old.username is distinct from new.username
       and old.username is not null
       and old.username_changed_at is not null
       and old.username_changed_at > now() - interval '30 days' then
      raise exception 'username_change_cooldown' using errcode = '23514';
    end if;

    if exists (
      select 1 from testimony.username_history
      where old_username = new.username
        and released_at > now()
        and user_id <> new.id
    ) then
      raise exception 'username_recently_used' using errcode = '23505';
    end if;

    if tg_op = 'UPDATE' and old.username is distinct from new.username then
      new.username_changed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_username on testimony.profiles;
create trigger trg_validate_username
before insert or update of username on testimony.profiles
for each row execute function testimony.validate_username();

create or replace function testimony.log_username_change()
returns trigger language plpgsql security definer set search_path = testimony, public as $$
begin
  if tg_op = 'UPDATE' and old.username is distinct from new.username and old.username is not null then
    insert into testimony.username_history(user_id, old_username, new_username)
    values (old.id, old.username, new.username);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_username_change on testimony.profiles;
create trigger trg_log_username_change
after update of username on testimony.profiles
for each row execute function testimony.log_username_change();

-- =========================================================
-- Skydda admin-flaggor mot self-update
-- =========================================================
create or replace function testimony.protect_profile_admin_flags()
returns trigger language plpgsql security definer set search_path = testimony, public as $$
begin
  if not coalesce(testimony.is_moderator(auth.uid()), false) then
    new.is_moderator := old.is_moderator;
    new.is_org_admin := old.is_org_admin;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_admin_flags on testimony.profiles;
create trigger trg_protect_admin_flags
before update on testimony.profiles
for each row execute function testimony.protect_profile_admin_flags();

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists profiles_church_id_idx on testimony.profiles(church_id);
create index if not exists profiles_city_idx on testimony.profiles(city);
create index if not exists profiles_visibility_idx on testimony.profiles(profile_visibility);
create index if not exists profiles_last_active_idx on testimony.profiles(last_active_at desc);

-- =========================================================
-- Audit log
-- =========================================================
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='testimony' and t.typname='audit_action') then
    create type testimony.audit_action as enum (
      'profile_created','profile_updated','username_changed','consent_granted',
      'consent_withdrawn','data_exported','account_deleted','account_anonymized',
      'avatar_uploaded','avatar_deleted','login','privacy_changed'
    );
  end if;
end $$;

create table if not exists testimony.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action testimony.audit_action not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_user_idx on testimony.audit_log(user_id, created_at desc);
create index if not exists audit_log_action_idx on testimony.audit_log(action, created_at desc);

-- =========================================================
-- Consent log
-- =========================================================
create table if not exists testimony.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  policy_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip_hash text,
  user_agent text
);
create index if not exists consent_log_user_idx on testimony.consent_log(user_id, consent_type);

-- =========================================================
-- Data export jobs
-- =========================================================
create table if not exists testimony.data_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  file_path text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- =========================================================
-- Public view (säker för anon access)
-- =========================================================
create or replace view testimony.public_profiles as
select
  p.id,
  case when p.is_anonymized then 'Anonym användare' else p.display_name end as display_name,
  case when p.is_anonymized then null else p.username::text end as username,
  case when p.is_anonymized then null else p.avatar_url end as avatar_url,
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
    when (p.field_visibility->>'favorite_verse') = 'public' then p.favorite_verse
    else null
  end as favorite_verse,
  p.created_at,
  p.is_anonymized
from testimony.profiles p
where p.profile_visibility = 'public'
  and p.deleted_at is null;

grant select on testimony.public_profiles to anon, authenticated;

-- =========================================================
-- RLS policies (uppdatera + nya)
-- =========================================================
alter table testimony.username_history enable row level security;
alter table testimony.audit_log enable row level security;
alter table testimony.consent_log enable row level security;
alter table testimony.data_export_jobs enable row level security;
alter table testimony.reserved_usernames enable row level security;

-- Ersätt befintlig profiles read-policy med visibility-baserad
drop policy if exists profiles_self_read on testimony.profiles;
drop policy if exists profiles_visibility_read on testimony.profiles;
create policy profiles_visibility_read on testimony.profiles
  for select using (
    auth.uid() = id
    or coalesce(testimony.is_moderator(auth.uid()), false)
    or (profile_visibility = 'public' and deleted_at is null)
    or (profile_visibility = 'members_only' and auth.uid() is not null and deleted_at is null)
  );

drop policy if exists username_history_self_read on testimony.username_history;
create policy username_history_self_read on testimony.username_history
  for select using (auth.uid() = user_id or coalesce(testimony.is_moderator(auth.uid()), false));

drop policy if exists audit_log_self_read on testimony.audit_log;
create policy audit_log_self_read on testimony.audit_log
  for select using (auth.uid() = user_id or coalesce(testimony.is_moderator(auth.uid()), false));

drop policy if exists consent_log_self_read on testimony.consent_log;
create policy consent_log_self_read on testimony.consent_log
  for select using (auth.uid() = user_id or coalesce(testimony.is_moderator(auth.uid()), false));
drop policy if exists consent_log_self_insert on testimony.consent_log;
create policy consent_log_self_insert on testimony.consent_log
  for insert with check (auth.uid() = user_id);

drop policy if exists export_jobs_self_all on testimony.data_export_jobs;
create policy export_jobs_self_all on testimony.data_export_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reserved_usernames_read on testimony.reserved_usernames;
create policy reserved_usernames_read on testimony.reserved_usernames
  for select using (true);

-- =========================================================
-- RPC: account_anonymize
-- =========================================================
create or replace function testimony.account_anonymize(p_user_id uuid, p_keep_contributions boolean default true)
returns void language plpgsql security definer set search_path = testimony, public as $$
declare
  v_caller uuid := auth.uid();
  v_short text;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if v_caller <> p_user_id and not coalesce(testimony.is_moderator(v_caller), false) then
    raise exception 'not_authorized';
  end if;

  v_short := substring(replace(p_user_id::text,'-',''), 1, 8);

  if p_keep_contributions then
    update testimony.profiles set
      display_name = 'Anonym användare',
      username = ('raderad-' || v_short)::citext,
      first_name = null,
      last_name = null,
      bio = null,
      city = null,
      avatar_url = null,
      church = null,
      church_id = null,
      denomination = null,
      role_in_church = null,
      believer_since = null,
      favorite_verse = null,
      profile_visibility = 'private',
      is_anonymized = true,
      deleted_at = now(),
      updated_at = now()
    where id = p_user_id;

    update testimony.testimonies set is_anonymous = true where author_id = p_user_id;
    update testimony.prayer_requests set is_anonymous = true where author_id = p_user_id;
    update testimony.prayer_answers set is_anonymous = true where author_id = p_user_id;
    update testimony.gratitudes set is_anonymous = true where author_id = p_user_id;
  else
    delete from testimony.testimonies where author_id = p_user_id;
    delete from testimony.prayer_requests where author_id = p_user_id;
    delete from testimony.prayer_answers where author_id = p_user_id;
    delete from testimony.gratitudes where author_id = p_user_id;
  end if;

  insert into testimony.audit_log(user_id, action, metadata)
  values (p_user_id, 'account_anonymized',
          jsonb_build_object('keep_contributions', p_keep_contributions, 'by', v_caller));
end;
$$;

grant execute on function testimony.account_anonymize(uuid, boolean) to authenticated;

-- =========================================================
-- RPC: profile_my_contributions
-- =========================================================
create or replace function testimony.profile_my_contributions(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = testimony, public as $$
  select jsonb_build_object(
    'testimonies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'slug', slug, 'title', title, 'status', status,
        'published_at', published_at, 'created_at', created_at,
        'is_anonymous', is_anonymous
      ) order by created_at desc)
      from testimony.testimonies where author_id = p_user_id
    ), '[]'::jsonb),
    'prayer_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'is_answered', is_answered,
        'is_anonymous', is_anonymous, 'created_at', created_at
      ) order by created_at desc)
      from testimony.prayer_requests where author_id = p_user_id
    ), '[]'::jsonb),
    'prayer_answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'request_id', request_id, 'status', status,
        'is_anonymous', is_anonymous, 'created_at', created_at
      ) order by created_at desc)
      from testimony.prayer_answers where author_id = p_user_id
    ), '[]'::jsonb),
    'gratitudes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'status', status, 'is_anonymous', is_anonymous,
        'created_at', created_at
      ) order by created_at desc)
      from testimony.gratitudes where author_id = p_user_id
    ), '[]'::jsonb)
  );
$$;

grant execute on function testimony.profile_my_contributions(uuid) to authenticated;

-- =========================================================
-- RPC: username_check (server-side helper)
-- =========================================================
create or replace function testimony.username_check(p_username text, p_self uuid default null)
returns jsonb language plpgsql stable security definer set search_path = testimony, public as $$
declare
  v_norm citext := lower(p_username)::citext;
begin
  if p_username !~ '^[a-z0-9][a-z0-9_-]{2,29}$' then
    return jsonb_build_object('available', false, 'reason', 'invalid_format');
  end if;
  if exists (select 1 from testimony.reserved_usernames where username = v_norm) then
    return jsonb_build_object('available', false, 'reason', 'reserved');
  end if;
  if exists (select 1 from testimony.profiles where username = v_norm and (p_self is null or id <> p_self)) then
    return jsonb_build_object('available', false, 'reason', 'taken');
  end if;
  if exists (
    select 1 from testimony.username_history
    where old_username = v_norm
      and released_at > now()
      and (p_self is null or user_id <> p_self)
  ) then
    return jsonb_build_object('available', false, 'reason', 'recently_used');
  end if;
  return jsonb_build_object('available', true);
end;
$$;

grant execute on function testimony.username_check(text, uuid) to authenticated, anon;
