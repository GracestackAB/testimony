-- Fix auth.users aud/role for self-hosted GoTrue + PostgREST.
--
-- GoTrue password/OAuth lookup: FindUserByEmailAndAudience matches aud column against
-- GOTRUE_JWT_AUD (default empty string '').
-- PostgREST: JWT role claim must be 'authenticated' (from users.role column).
--
-- Migrated accounts had aud='authenticated' (login fails) or role='' (REST fails).

update auth.users
set
  aud = coalesce(nullif(aud, 'authenticated'), ''),
  role = case when role is null or role = '' then 'authenticated' else role end
where aud is distinct from coalesce(nullif(aud, 'authenticated'), '')
   or role is null
   or role = '';

-- Auto-create profile in testimony schema (not legacy public.profiles).
create or replace function testimony.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = testimony, auth, public
as $$
begin
  insert into testimony.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function testimony.handle_new_user();
