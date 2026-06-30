-- testimony.se · Privat andakt — journaler mellan användare och Gud
-- Endast ägaren ser sina poster (RLS). Raderas vid kontoborttagning.

create type testimony.spiritual_journal_category as enum (
  'gratitude',
  'prayer',
  'confession',
  'reflection',
  'promise',
  'scripture',
  'answered_prayer',
  'growth'
);

create table if not exists testimony.spiritual_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category testimony.spiritual_journal_category not null,
  title text,
  body text not null check (char_length(trim(body)) > 0),
  scripture_ref text,
  entry_date date not null default (timezone('utc', now()))::date,
  is_pinned boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spiritual_journal_user_cat_idx
  on testimony.spiritual_journal_entries (user_id, category, entry_date desc);

create index if not exists spiritual_journal_user_date_idx
  on testimony.spiritual_journal_entries (user_id, entry_date desc);

alter table testimony.spiritual_journal_entries enable row level security;

drop policy if exists spiritual_journal_self_select on testimony.spiritual_journal_entries;
create policy spiritual_journal_self_select on testimony.spiritual_journal_entries
  for select using (auth.uid() = user_id);

drop policy if exists spiritual_journal_self_insert on testimony.spiritual_journal_entries;
create policy spiritual_journal_self_insert on testimony.spiritual_journal_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists spiritual_journal_self_update on testimony.spiritual_journal_entries;
create policy spiritual_journal_self_update on testimony.spiritual_journal_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists spiritual_journal_self_delete on testimony.spiritual_journal_entries;
create policy spiritual_journal_self_delete on testimony.spiritual_journal_entries
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on testimony.spiritual_journal_entries to authenticated, service_role;

-- Privata journaler ska alltid raderas vid kontoborttagning
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

  delete from testimony.spiritual_journal_entries where user_id = p_user_id;

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
