# Testimony.se — User Profile System (Phase 1 MVP)

**Status:** Spec ready for implementation
**Author:** Cascade (architect role)
**Target implementer:** Cascade / SWE-1.6 coding agent
**Stack:** Next.js 16 (App Router) · Supabase Postgres · Magic link auth · TypeScript · Tailwind
**Supabase project:** `hzkhvjssxikyxnoirgca`
**Scope:** Phase 1 — basic profile, congregation/denomination, privacy controls, own contributions list, GDPR compliance. **NO** follow/comments/reactions/congregation pages.

---

## 0. Summary of decisions taken in this spec

These are decisions baked into the spec. Override before implementation if you disagree (see §11).

| # | Decision | Rationale |
|---|---|---|
| D1 | Profile auto-created on first login (stub already exists via `handle_new_user` trigger). Onboarding is a **soft prompt** on `/konto` after signup, not a blocking gate. | Magic link UX should not be interrupted; users can post `böneämne` immediately. |
| D2 | Username is **separate from `display_name`**, set during onboarding (optional in MVP), used for `/u/[username]`. Profiles without username use UUID-based fallback URL `/u/id/[uuid]`. | Avoids name collisions, gives clean URLs, allows "Anonym" display while still having a stable profile. |
| D3 | Username changes allowed once every **30 days**, old username reserved for 90 days then released. No automatic redirects (would require a `username_history` table — implemented but no redirect middleware in MVP). | Balance flexibility with anti-impersonation. |
| D4 | Congregation = **free text** at MVP launch with autocomplete from existing values. Schema includes nullable `church_id` FK to a future `churches` table. | Curated list requires research; free text + later migration is fine. |
| D5 | Denomination = **dropdown, optional, GDPR Article 9 explicit consent required** before persisting. Stored as enum, displayed only with explicit per-field consent. | Religious belief = special category. Lawful basis = Art. 9(2)(a) explicit consent. |
| D6 | Account deletion = **anonymize contributions, hard-delete PII**. User picks at delete time: "Behåll mina vittnesbörd anonymt" (default) or "Radera allt jag skrivit". | Preserves community value while honoring GDPR Art. 17. |
| D7 | Avatar = Supabase Storage bucket `avatars`, max 2 MB, JPEG/PNG/WebP, server-side resized to 512×512. Fallback = initials on colored gradient. | Standard, cheap, no third-party dep. |
| D8 | Profile visibility levels: `public` / `members_only` / `private`. Per-field visibility for `church`, `denomination`, `role_in_church`, `salvation_date`. | Matches Christian community sensitivity around "outing" denomination. |
| D9 | Existing `profiles` table is **extended in place** via a new migration `0002_profiles_phase1.sql`. No data loss. | Trigger already creates profiles for all auth users. |
| D10 | URL: `/u/[username]` for public profile, `/konto` for own dashboard (already exists), `/konto/redigera` for edit, `/konto/integritet` for privacy settings, `/konto/exportera` and `/konto/radera`. | Swedish-first URLs match existing site. |

---

## 1. Database schema

### 1.1 Migration: `supabase/migrations/0002_profiles_phase1.sql`

```sql
-- testimony.se · profiler Fas 1
-- Utökar befintlig profiles-tabell, lägger till privacy + GDPR-spår.

-- =========================================================
-- Reserverade användarnamn
-- =========================================================
create table if not exists public.reserved_usernames (
  username citext primary key,
  reason text not null default 'system',  -- system | profanity | brand | impersonation
  created_at timestamptz not null default now()
);

insert into public.reserved_usernames (username, reason) values
  ('admin','system'), ('administrator','system'), ('moderator','system'),
  ('mod','system'), ('root','system'), ('support','system'), ('hjalp','system'),
  ('hjälp','system'), ('kontakt','system'), ('redaktion','system'),
  ('testimony','brand'), ('vittnesbord','brand'), ('vittnesbörd','brand'),
  ('gracestack','brand'), ('kim','brand'), ('sofia','brand'),
  ('jesus','brand'), ('gud','brand'), ('herren','brand'),
  ('anonym','system'), ('borttagen','system'), ('raderad','system'),
  ('null','system'), ('undefined','system'), ('api','system'),
  ('auth','system'), ('konto','system'), ('login','system'),
  ('signup','system'), ('logout','system'), ('u','system'), ('user','system')
on conflict do nothing;

-- =========================================================
-- Utöka profiles
-- =========================================================
alter table public.profiles
  add column if not exists username citext unique,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists city text,
  add column if not exists denomination text,           -- enum-kontroll i CHECK nedan
  add column if not exists role_in_church text,         -- enum-kontroll i CHECK nedan
  add column if not exists believer_since date,         -- "frälsningsdag"
  add column if not exists favorite_verse text,
  add column if not exists church_id uuid references public.organizations(id) on delete set null,
  add column if not exists last_active_at timestamptz,
  add column if not exists username_changed_at timestamptz,
  add column if not exists onboarding_completed boolean not null default false,
  -- Privacy
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
  -- GDPR Art. 9 explicit consent for denomination
  add column if not exists consent_special_category_at timestamptz,
  add column if not exists consent_special_category_version text,
  -- Soft delete / anonymization
  add column if not exists deleted_at timestamptz,
  add column if not exists is_anonymized boolean not null default false;

-- Constraints
alter table public.profiles
  drop constraint if exists profiles_username_format,
  add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9][a-z0-9_-]{2,29}$');

alter table public.profiles
  drop constraint if exists profiles_denomination_valid,
  add constraint profiles_denomination_valid
    check (denomination is null or denomination in (
      'pingst','efk','svenska_kyrkan','katolska','equmenia','baptist',
      'fralsningsarmen','adventist','ortodox','fri_oberoende','annan','vill_ej_ange'
    ));

alter table public.profiles
  drop constraint if exists profiles_role_valid,
  add constraint profiles_role_valid
    check (role_in_church is null or role_in_church in (
      'medlem','ledare','pastor','ungdomsledare','volontar','besokare','annan'
    ));

alter table public.profiles
  drop constraint if exists profiles_bio_length,
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 240);

alter table public.profiles
  drop constraint if exists profiles_username_not_reserved,
  add constraint profiles_username_not_reserved
    check (username is null or not exists (
      select 1 from public.reserved_usernames where reserved_usernames.username = profiles.username
    ));
-- ^ NOTE: PostgreSQL CHECK constraints cannot reference other tables.
--   Replace with a BEFORE INSERT/UPDATE trigger (see below).

-- Trigger: validate reserved usernames + 30-day cooldown + no taken-history collision
create or replace function public.validate_username()
returns trigger language plpgsql as $$
begin
  if new.username is not null then
    -- normalize
    new.username := lower(new.username);

    -- reserved
    if exists (select 1 from public.reserved_usernames where username = new.username) then
      raise exception 'username_reserved' using errcode = '23514';
    end if;

    -- 30-day cooldown for changes
    if tg_op = 'UPDATE'
       and old.username is distinct from new.username
       and old.username is not null
       and old.username_changed_at is not null
       and old.username_changed_at > now() - interval '30 days' then
      raise exception 'username_change_cooldown' using errcode = '23514';
    end if;

    -- 90-day reserve window from username_history
    if exists (
      select 1 from public.username_history
      where old_username = new.username
        and released_at > now() - interval '90 days'
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

drop trigger if exists trg_validate_username on public.profiles;
create trigger trg_validate_username
before insert or update of username on public.profiles
for each row execute function public.validate_username();

-- =========================================================
-- Username history (för cooldown + senare redirects)
-- =========================================================
create table if not exists public.username_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  old_username citext not null,
  new_username citext,
  changed_at timestamptz not null default now(),
  released_at timestamptz not null default (now() + interval '90 days')
);
create index if not exists username_history_old_idx on public.username_history(old_username);
create index if not exists username_history_user_idx on public.username_history(user_id);

create or replace function public.log_username_change()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'UPDATE' and old.username is distinct from new.username and old.username is not null then
    insert into public.username_history(user_id, old_username, new_username)
    values (old.id, old.username, new.username);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_username_change on public.profiles;
create trigger trg_log_username_change
after update of username on public.profiles
for each row execute function public.log_username_change();

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists profiles_username_idx on public.profiles(username) where username is not null;
create index if not exists profiles_church_id_idx on public.profiles(church_id);
create index if not exists profiles_city_idx on public.profiles(city);
create index if not exists profiles_visibility_idx on public.profiles(profile_visibility);
create index if not exists profiles_last_active_idx on public.profiles(last_active_at desc);

-- =========================================================
-- Audit log (GDPR-krav)
-- =========================================================
create type public.audit_action as enum (
  'profile_created','profile_updated','username_changed','consent_granted',
  'consent_withdrawn','data_exported','account_deleted','account_anonymized',
  'avatar_uploaded','avatar_deleted','login','privacy_changed'
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action public.audit_action not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,                 -- SHA-256 av IP, INTE klartext
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_user_idx on public.audit_log(user_id, created_at desc);
create index if not exists audit_log_action_idx on public.audit_log(action, created_at desc);

-- =========================================================
-- Consent log (separat från audit för tydlighet i GDPR-export)
-- =========================================================
create table if not exists public.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,             -- 'tos' | 'privacy_policy' | 'special_category_religion' | 'newsletter'
  granted boolean not null,
  policy_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip_hash text,
  user_agent text
);
create index if not exists consent_log_user_idx on public.consent_log(user_id, consent_type);

-- =========================================================
-- Data export jobs (för asynk export om det blir tungt; OK med synk i MVP)
-- =========================================================
create table if not exists public.data_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',   -- pending | running | done | failed
  file_path text,                            -- Supabase Storage path
  expires_at timestamptz,                    -- 7 dagar
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- =========================================================
-- Username reservation för anonymisering
-- =========================================================
-- När konto anonymiseras: username sätts till "raderad-<short_id>"
-- och profilen markeras is_anonymized = true.
-- Innehåll behåller author_id men en SQL-vy filtrerar bort PII.

-- =========================================================
-- VIEW: publik profilvy (säker mot RLS-läckage)
-- =========================================================
create or replace view public.public_profiles as
select
  p.id,
  case when p.is_anonymized then 'Anonym användare' else p.display_name end as display_name,
  case when p.is_anonymized then null else p.username end as username,
  case when p.is_anonymized then null else p.avatar_url end as avatar_url,
  case
    when p.is_anonymized then null
    when p.field_visibility->>'bio' = 'public' then p.bio
    else null
  end as bio,
  case
    when p.is_anonymized then null
    when p.field_visibility->>'city' = 'public' then p.city
    else null
  end as city,
  case
    when p.is_anonymized then null
    when p.field_visibility->>'church' = 'public' then p.church
    else null
  end as church,
  case
    when p.is_anonymized then null
    when p.field_visibility->>'denomination' = 'public'
         and p.consent_special_category_at is not null
    then p.denomination
    else null
  end as denomination,
  case
    when p.is_anonymized then null
    when p.field_visibility->>'role_in_church' = 'public' then p.role_in_church
    else null
  end as role_in_church,
  case
    when p.is_anonymized then null
    when p.field_visibility->>'favorite_verse' = 'public' then p.favorite_verse
    else null
  end as favorite_verse,
  p.created_at,
  p.is_anonymized
from public.profiles p
where p.profile_visibility = 'public'
  and p.deleted_at is null;

grant select on public.public_profiles to anon, authenticated;

-- =========================================================
-- Uppdatera handle_new_user för att INTE sätta username
-- =========================================================
-- (befintlig handle_new_user lämnas — den sätter bara display_name)

-- =========================================================
-- RLS-policies (utöka befintliga)
-- =========================================================
-- Profiler: nuvarande policy "profiles_self_read FOR SELECT USING (true)" är för öppen.
-- Ersätt med visibility-baserad.

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_visibility_read on public.profiles;
create policy profiles_visibility_read on public.profiles
  for select using (
    -- alltid läsbar för dig själv
    auth.uid() = id
    -- moderatorer ser allt
    or public.is_moderator(auth.uid())
    -- publika profiler synliga för alla
    or (profile_visibility = 'public' and deleted_at is null)
    -- medlemsprofiler synliga för inloggade
    or (profile_visibility = 'members_only' and auth.uid() is not null and deleted_at is null)
  );

-- Self-update finns redan, men måste blockera ändring av is_moderator/is_org_admin.
-- Detta hanteras enklast med en BEFORE UPDATE-trigger:
create or replace function public.protect_profile_admin_flags()
returns trigger language plpgsql as $$
begin
  if not public.is_moderator(auth.uid()) then
    new.is_moderator := old.is_moderator;
    new.is_org_admin := old.is_org_admin;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_admin_flags on public.profiles;
create trigger trg_protect_admin_flags
before update on public.profiles
for each row execute function public.protect_profile_admin_flags();

-- RLS för nya tabeller
alter table public.username_history enable row level security;
alter table public.audit_log enable row level security;
alter table public.consent_log enable row level security;
alter table public.data_export_jobs enable row level security;
alter table public.reserved_usernames enable row level security;

create policy username_history_self_read on public.username_history
  for select using (auth.uid() = user_id or public.is_moderator(auth.uid()));

create policy audit_log_self_read on public.audit_log
  for select using (auth.uid() = user_id or public.is_moderator(auth.uid()));
-- INSERTs sker via SECURITY DEFINER-funktioner; ingen direkt insert-policy.

create policy consent_log_self_read on public.consent_log
  for select using (auth.uid() = user_id or public.is_moderator(auth.uid()));
create policy consent_log_self_insert on public.consent_log
  for insert with check (auth.uid() = user_id);

create policy export_jobs_self_all on public.data_export_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy reserved_usernames_read on public.reserved_usernames
  for select using (true);

-- =========================================================
-- RPC: account_anonymize (anropas av användaren själv eller moderator)
-- =========================================================
create or replace function public.account_anonymize(p_user_id uuid, p_keep_contributions boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_short text;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if v_caller <> p_user_id and not public.is_moderator(v_caller) then
    raise exception 'not_authorized';
  end if;

  v_short := substring(replace(p_user_id::text,'-',''), 1, 8);

  if p_keep_contributions then
    -- Anonymisera profil men behåll author_id på innehåll
    update public.profiles set
      display_name = 'Anonym användare',
      username = 'raderad-' || v_short,
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

    -- Markera vittnesbörd som anonyma men behåll innehåll
    update public.testimonies set is_anonymous = true where author_id = p_user_id;
    update public.prayer_requests set is_anonymous = true where author_id = p_user_id;
    update public.prayer_answers set is_anonymous = true where author_id = p_user_id;
  else
    -- Hård radering av innehåll
    delete from public.testimonies where author_id = p_user_id;
    delete from public.prayer_requests where author_id = p_user_id;
    delete from public.prayer_answers where author_id = p_user_id;
    -- Profilen raderas via auth.users CASCADE när auth-användaren raderas
  end if;

  insert into public.audit_log(user_id, action, metadata)
  values (p_user_id, 'account_anonymized',
          jsonb_build_object('keep_contributions', p_keep_contributions, 'by', v_caller));
end;
$$;

grant execute on function public.account_anonymize(uuid, boolean) to authenticated;

-- =========================================================
-- RPC: profile_get_my_contributions
-- =========================================================
create or replace function public.profile_my_contributions(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'testimonies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'slug', slug, 'title', title, 'status', status,
        'published_at', published_at, 'created_at', created_at
      ) order by created_at desc)
      from public.testimonies where author_id = p_user_id
    ), '[]'::jsonb),
    'prayer_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'is_answered', is_answered,
        'is_anonymous', is_anonymous, 'created_at', created_at
      ) order by created_at desc)
      from public.prayer_requests where author_id = p_user_id
    ), '[]'::jsonb),
    'prayer_answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'request_id', request_id, 'status', status, 'created_at', created_at
      ) order by created_at desc)
      from public.prayer_answers where author_id = p_user_id
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.profile_my_contributions(uuid) to authenticated;
```

### 1.2 Storage bucket

```sql
-- Skapa via Supabase Studio eller migration:
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

-- Policies
create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatar_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatar_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Path convention:** `avatars/{user_id}/avatar-{timestamp}.webp`

---

## 2. Migration plan for existing data

The existing schema already has:
- `profiles` table with `id` FK to `auth.users` (1:1)
- `handle_new_user` trigger that auto-creates profile rows
- `testimonies.author_id`, `prayer_requests.author_id`, `prayer_answers.author_id` already FK to `auth.users`

**This means there is no orphan content problem.** All existing rows already have `author_id` (or NULL if anonymous-by-design).

### 2.1 Migration order (zero downtime)

1. **Pre-deploy:** Apply `0002_profiles_phase1.sql` (additive only — `ALTER TABLE ADD COLUMN IF NOT EXISTS`, no `DROP`).
2. **Pre-deploy:** Create `avatars` storage bucket + policies.
3. **Deploy app:** Ship new UI/API. Old clients keep working because all new fields are nullable.
4. **Post-deploy backfill:** Run idempotent SQL:
   ```sql
   update public.profiles
   set first_name = split_part(coalesce(display_name,''),' ',1)
   where first_name is null and display_name is not null;
   ```
5. **No data migration needed** for content — `author_id` is already in place.

### 2.2 Handling content with `author_id IS NULL`

Treat as "Anonym" forever. UI shows "Anonym vän" with no profile link. Do **not** attempt email-match attribution (privacy risk).

### 2.3 Soft delete strategy

- `profiles.deleted_at` set on anonymization.
- `auth.users` deletion is **only** triggered when user explicitly chooses "Radera helt". Cascades to `profiles` via existing FK.
- Content rows are kept with `is_anonymous = true` in the "keep" path.

---

## 3. Auth integration

### 3.1 Magic link → profile flow

```
1. User enters email on /login
2. Supabase sends magic link
3. User clicks link → /auth/callback exchanges code → session
4. Middleware checks: is profile.onboarding_completed?
   - YES → redirect to original destination (or /konto)
   - NO  → redirect to /konto/valkommen (soft onboarding)
5. User can skip onboarding ("Hoppa över") — only display_name + ToS consent required to proceed.
```

The existing `handle_new_user` trigger already creates the profile stub. No code change needed there.

### 3.2 Username collision

- DB enforces unique on `citext` column → case-insensitive unique.
- API endpoint `GET /api/profile/username-available?u=foo` for live check.
- On submit, return 409 with code `username_taken` or `username_reserved` or `username_recently_used`.

### 3.3 Account deletion (GDPR Art. 17)

Two paths in UI (`/konto/radera`):

| Choice | Effect |
|---|---|
| **"Anonymisera mig, behåll mina vittnesbörd"** (default) | RPC `account_anonymize(uid, true)`. PII wiped, content remains as "Anonym vän". `auth.users` row also deleted via admin API → user can sign up again with same email. |
| **"Radera allt jag skrivit"** | RPC `account_anonymize(uid, false)` → deletes content, then admin-API deletes `auth.users` row → CASCADE removes profile. |

Audit log entry written in both paths. Email confirmation sent ("Ditt konto är raderat"). 30-day grace period optional in Phase 2.

---

## 4. Privacy & GDPR

### 4.1 Special category data (Art. 9)

**Denomination + role_in_church + favorite_verse + believer_since** all reveal religious belief → Article 9 special category.

**Lawful basis:** Article 9(2)(a) — explicit consent.

**Consent mechanism:**
- Onboarding shows a dedicated section: *"För att visa församling, samfund och frälsningsdag behöver vi ditt uttryckliga samtycke. Detta är 'känsliga personuppgifter' enligt GDPR. Du kan när som helst återkalla samtycket."*
- A specific checkbox: "Jag samtycker till att Testimony.se behandlar mina religiösa uppgifter (samfund, roll, frälsningsdag, favoritbibelvers) i syfte att visa dem på min profil enligt mina synlighetsval."
- On grant: `consent_log` row + `profiles.consent_special_category_at = now()` + `consent_special_category_version = 'v1.0'`.
- These fields **cannot be saved** by the API if `consent_special_category_at IS NULL`. API returns 403 `consent_required`.
- **Withdrawal:** Settings page button → clears the four fields, sets `consent_special_category_at = NULL`, writes withdrawal row to `consent_log`.

### 4.2 Data export endpoint

`POST /api/profile/export` → synchronous in MVP (most users have <100 KB):
- Returns JSON file `testimony-export-{date}.json` with:
  - profile (all fields)
  - testimonies, prayer_requests, prayer_answers (all by user)
  - reactions
  - volunteer_applications
  - donations (basic info only — no Stripe internals)
  - consent_log
  - audit_log (last 90 days, user-scoped)
- Async path via `data_export_jobs` reserved for Phase 2.

### 4.3 Audit log requirements

Logged events: profile create/update, username change, consent grant/withdraw, data export, account anonymize/delete, avatar upload/delete, privacy setting change. Login events optional in Phase 1 (Supabase already logs auth events).

IP stored as **SHA-256 hash with site-wide salt** (env: `AUDIT_IP_SALT`). Never plain.

### 4.4 Updated `integritetspolicy` — required additions

The existing `/integritet` page needs new sections:
- **Vilka uppgifter samlar vi in** — utökad med: användarnamn, profilbild, ort, församling, samfund, roll, frälsningsdag, favoritvers.
- **Känsliga personuppgifter** — eget stycke som förklarar Art. 9-samtycke.
- **Rättslig grund per kategori:**
  - Konto (e-post, display_name): avtal (Art. 6.1.b)
  - Profilfält (allmänna): berättigat intresse / samtycke (Art. 6.1.a/f)
  - Religiösa uppgifter: explicit samtycke (Art. 9.2.a)
- **Dina rättigheter:** tillgång (export), rättelse (redigera profil), radering, dataportabilitet, återkalla samtycke, klaga till IMY.
- **Lagringstid:** profildata tills konto raderas; audit log 24 mån; consent log 7 år (bokföringskrav GDPR-bevis).
- **Tredjepartsmottagare:** Supabase (Frankfurt EU), Resend (EU), Stripe (donationer).

### 4.5 Consent UI flow at signup

```
[Login email → magic link → first /auth/callback]
                              ↓
              /konto/valkommen (onboarding)
                              ↓
   ┌───────── Step 1: Visningsnamn ──────────┐
   │  - first_name, last_name (eller bara first) │
   │  - username (med live-koll)               │
   └────────────┬─────────────────────────────┘
                ↓
   ┌───────── Step 2: Vill du säga mer? ─────┐
   │  - Avatar (valfri)                       │
   │  - Bio (valfri)                          │
   │  - Stad (valfri)                         │
   └────────────┬─────────────────────────────┘
                ↓
   ┌───────── Step 3: Tro & församling ──────┐
   │  ⚠️  GDPR-ruta:                          │
   │  "Detta är känsliga personuppgifter."   │
   │  [ ] Jag samtycker (krävs för dessa fält)│
   │  - Församling (free text + autocomplete) │
   │  - Samfund (dropdown)                    │
   │  - Roll (dropdown)                       │
   │  - Frälsningsdag (date)                  │
   │  - Favoritvers (text)                    │
   │  → "Hoppa över" tillåtet                 │
   └────────────┬─────────────────────────────┘
                ↓
   ┌───────── Step 4: Synlighet ─────────────┐
   │  Per-fält visibility: public/members/private │
   └────────────┬─────────────────────────────┘
                ↓
   ┌───────── Step 5: Villkor ────────────────┐
   │  [ ] Användarvillkor (krav)              │
   │  [ ] Integritetspolicy (krav)            │
   │  [ ] Nyhetsbrev (frivilligt)             │
   └────────────┬─────────────────────────────┘
                ↓
            onboarding_completed = true
                              ↓
                       /konto (dashboard)
```

---

## 5. API endpoints

All endpoints under `/app/api/profile/*` and a few under `/app/api/account/*`. All return JSON. All require `auth.uid()` from Supabase SSR helper unless marked **PUBLIC**.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/profile/me` | required | Fetch own full profile |
| PATCH | `/api/profile/me` | required | Update profile fields |
| GET | `/api/profile/username-available` | required | `?u=foo` → `{available: bool, reason?: string}` |
| POST | `/api/profile/avatar` | required | Multipart upload, returns `{avatar_url}` |
| DELETE | `/api/profile/avatar` | required | Removes avatar |
| PATCH | `/api/profile/visibility` | required | Update profile_visibility + field_visibility |
| POST | `/api/profile/consent` | required | Grant/withdraw special-category consent |
| GET | `/api/profile/contributions` | required | Own testimonies + prayers (uses RPC) |
| GET | `/api/profile/[username]` | **PUBLIC** | Public profile view (RLS-filtered via view) |
| GET | `/api/profile/[username]/contributions` | **PUBLIC** | Published contributions only |
| POST | `/api/account/export` | required | Returns full JSON export |
| POST | `/api/account/delete` | required | Body: `{keep_contributions: boolean, confirm: 'RADERA'}` |
| POST | `/api/account/onboarding-complete` | required | Marks onboarding done |

### 5.1 Request/response shapes

**GET `/api/profile/me`** → 200
```json
{
  "id": "uuid",
  "username": "anna_pingst",
  "display_name": "Anna L.",
  "first_name": "Anna",
  "last_name": "Larsson",
  "avatar_url": "https://.../avatars/uuid/avatar-...webp",
  "bio": "Bibellärare i Linköping.",
  "city": "Linköping",
  "church": "Pingstkyrkan Linköping",
  "church_id": null,
  "denomination": "pingst",
  "role_in_church": "ledare",
  "believer_since": "2008-04-12",
  "favorite_verse": "Jeremia 29:11",
  "profile_visibility": "public",
  "field_visibility": {
    "church": "public",
    "denomination": "members_only",
    "role_in_church": "members_only",
    "believer_since": "private",
    "favorite_verse": "public",
    "city": "public",
    "bio": "public"
  },
  "consent_special_category_at": "2026-04-26T10:00:00Z",
  "onboarding_completed": true,
  "created_at": "...",
  "updated_at": "...",
  "last_active_at": "..."
}
```

**PATCH `/api/profile/me`** request:
```json
{
  "first_name": "Anna",
  "last_name": "Larsson",
  "bio": "...",
  "city": "Linköping",
  "username": "anna_pingst",
  "church": "Pingstkyrkan Linköping",
  "denomination": "pingst",
  "role_in_church": "ledare",
  "believer_since": "2008-04-12",
  "favorite_verse": "Jeremia 29:11"
}
```
Server validates: only sets denomination/role/believer_since/favorite_verse if `consent_special_category_at IS NOT NULL`, else returns 403:
```json
{ "error": "consent_required", "field": "denomination" }
```

**GET `/api/profile/username-available?u=foo`** → 200
```json
{ "available": false, "reason": "reserved" }
```
Reasons: `taken`, `reserved`, `recently_used`, `invalid_format`, `cooldown` (own user, within 30 days).

**POST `/api/profile/avatar`** (multipart, field `file`):
- Validate: ≤2 MB, mimetype in `image/jpeg|png|webp`.
- Server uses `sharp` (Next.js compatible) to resize to 512×512 WebP, quality 85.
- Upload to Supabase Storage `avatars/{uid}/avatar-{ts}.webp`.
- Update `profiles.avatar_url` to public URL.
- Delete previous avatar object (best-effort).
- Audit log.

**POST `/api/profile/consent`** request:
```json
{ "consent_type": "special_category_religion", "granted": true, "policy_version": "v1.0" }
```

**POST `/api/account/delete`** request:
```json
{ "keep_contributions": true, "confirm": "RADERA" }
```
Server validates `confirm === 'RADERA'`. Calls RPC `account_anonymize`. Then calls Supabase admin API `auth.admin.deleteUser(uid)`. Returns `{ status: "deleted" }` and clears session.

**GET `/api/profile/[username]`** (public) → 200 returns row from `public_profiles` view + counts:
```json
{
  "username": "anna_pingst",
  "display_name": "Anna L.",
  "avatar_url": "...",
  "bio": "...",
  "city": "Linköping",
  "church": "Pingstkyrkan Linköping",
  "favorite_verse": "Jeremia 29:11",
  "stats": { "testimonies": 3, "prayer_requests": 7, "prayer_answers": 2 },
  "member_since": "2025-09-01",
  "is_anonymized": false
}
```
404 if user not found / private / anonymized.

---

## 6. URL structure

| Route | Purpose | Auth |
|---|---|---|
| `/u/[username]` | Public profile page | public |
| `/u/id/[uuid]` | Fallback when user has no username | public |
| `/konto` | Own dashboard (already exists) | required |
| `/konto/valkommen` | Onboarding wizard | required |
| `/konto/redigera` | Edit profile (basic + faith fields) | required |
| `/konto/integritet` | Privacy/visibility settings + consent management | required |
| `/konto/exportera` | GDPR data export | required |
| `/konto/radera` | Account deletion flow | required |
| `/konto/anvandarnamn` | Change username (with cooldown info) | required |

**Why `/u/[username]`:** short, language-neutral, doesn't collide with future `/anvandare` (Swedish) which can serve as alias. Avoids `/profil` (could clash with org profiles). `/u/` is used by Reddit, Medium, GitHub-style apps and is well-understood.

---

## 7. Edge cases & gotchas

| Case | Handling |
|---|---|
| **Username changes** | 30-day cooldown. Old name reserved 90 days in `username_history`. No automatic redirects in Phase 1 — old URL returns 404. (Phase 2: middleware lookup → 301.) |
| **Inactive accounts** | `last_active_at` updated on each authenticated API call. No auto-deletion in MVP. Future: 24-month inactive → email warning → soft-anonymize. |
| **Banned/deleted users in old testimonies** | Content shows "Anonym vän" via the anonymization logic. No profile link. |
| **Mixed Swedish/English UI** | All labels Swedish. Validation messages keyed (`username_taken`) so frontend can localize. Bible verses in Swedish (Folkbibeln) by default. |
| **Avatar upload** | 2 MB hard limit, 512×512 WebP after server resize. No moderation in MVP — flag-button on profile pages (Phase 2). EXIF stripped via sharp. |
| **Reserved usernames** | `reserved_usernames` table seeded with admin/system/brand names. Trigger blocks insert. |
| **Profanity / impersonation** | Phase 1: regex format constraint (`^[a-z0-9][a-z0-9_-]{2,29}$`) blocks symbols. Manual moderation via admin panel. Phase 2: integrate svensk svärordlista + `levenshtein` distance check vs reserved + popular pastors list. |
| **Empty username at signup** | Allowed. Profile served at `/u/id/[uuid]`. User can claim a username later. |
| **Username case** | Stored as `citext`. Always lowercased on insert via trigger. Display can show original case from `display_name`. |
| **Email visibility** | Email is **never** exposed via any API response. Only `auth.users` has it. |
| **Concurrent profile updates** | Rely on Postgres row-level locking; no optimistic concurrency in MVP. |
| **Avatar deletion on account delete** | Storage objects under `avatars/{uid}/` deleted via admin API in delete handler. |
| **GDPR export size** | Cap at 10 MB synchronous; if exceeded, return 413 and create async job. |
| **Magic link reuse** | Already handled by Supabase. Onboarding state stored in DB so cross-device works. |
| **Role escalation** | `protect_profile_admin_flags` trigger ensures `is_moderator`/`is_org_admin` cannot be self-set via API. |
| **Free-text church → curated migration (Phase 2)** | When `churches` table arrives, add nullable `church_id` (already in schema), background job fuzzy-matches `church` text, sets `church_id` where confidence high. `church` text retained as fallback. |

---

## 8. Phase 2 forward-compatibility

Schema hooks already present so the following features can be added without migration pain:

| Phase 2 feature | Hook in MVP schema |
|---|---|
| **Follow / followers** | New table `public.follows(follower_id, followee_id)` — no profile change needed. |
| **Comments** | New table `public.comments(content_kind, content_id, author_id, body, status)` — `content_kind` enum already exists. |
| **Reactions on profiles** | Existing `reactions` table accepts new enum values; add `'profile'` to `content_kind`. |
| **Congregation pages** | `church_id` FK already on profiles → `organizations`. Phase 2 just adds `/forsamling/[slug]` route. |
| **Verified congregations** | Add `organizations.is_verified boolean` later. |
| **Username redirects** | `username_history` already logs old names. Add middleware that does `select user_id from username_history where old_username = X and released_at > now()` → 301. |
| **Direct messages** | Independent table; no profile change. |
| **Notification preferences** | Add `profiles.notification_prefs jsonb` later. |
| **Pronouns / language** | Add columns later — non-breaking. |
| **Multi-language UI** | `bio` is single-string; if multi-language needed, add `bio_i18n jsonb` and keep `bio` as default. |

---

## 9. File / folder structure for implementation

```
testimony/
├── supabase/migrations/
│   └── 0002_profiles_phase1.sql           ← migration from §1
├── lib/
│   ├── profile/
│   │   ├── schema.ts                       ← Zod schemas mirroring DB constraints
│   │   ├── types.ts                        ← TS types
│   │   ├── server.ts                       ← server-only helpers (getMyProfile, etc.)
│   │   ├── client.ts                       ← client fetchers
│   │   └── constants.ts                    ← DENOMINATIONS, ROLES, RESERVED_NAMES (mirror)
│   ├── consent/
│   │   ├── log.ts                          ← logConsent(userId, type, granted, version)
│   │   └── policy-versions.ts              ← { tos: 'v1.0', privacy: 'v1.0', special_category: 'v1.0' }
│   ├── audit/
│   │   └── log.ts                          ← logAudit(userId, action, metadata, req)
│   ├── avatar/
│   │   └── process.ts                      ← sharp resize → WebP
│   └── gdpr/
│       └── export.ts                       ← assembleExport(userId)
├── app/
│   ├── u/
│   │   ├── [username]/page.tsx             ← public profile
│   │   └── id/[uuid]/page.tsx              ← uuid fallback
│   ├── konto/
│   │   ├── page.tsx                        ← (existing) — extend with stats + contributions tabs
│   │   ├── valkommen/page.tsx              ← onboarding wizard
│   │   ├── redigera/page.tsx
│   │   ├── integritet/page.tsx
│   │   ├── exportera/page.tsx
│   │   ├── radera/page.tsx
│   │   └── anvandarnamn/page.tsx
│   └── api/
│       ├── profile/
│       │   ├── me/route.ts                 ← GET, PATCH
│       │   ├── username-available/route.ts ← GET
│       │   ├── avatar/route.ts             ← POST, DELETE
│       │   ├── visibility/route.ts         ← PATCH
│       │   ├── consent/route.ts            ← POST
│       │   ├── contributions/route.ts      ← GET
│       │   └── [username]/
│       │       ├── route.ts                ← GET (public)
│       │       └── contributions/route.ts  ← GET (public)
│       └── account/
│           ├── export/route.ts             ← POST
│           ├── delete/route.ts             ← POST
│           └── onboarding-complete/route.ts ← POST
├── components/
│   ├── profile/
│   │   ├── AvatarUpload.tsx
│   │   ├── DenominationConsent.tsx         ← GDPR Art. 9 consent box
│   │   ├── FieldVisibilityPicker.tsx
│   │   ├── ProfileHeader.tsx               ← used on /u/[username] + /konto
│   │   ├── ContributionsList.tsx
│   │   ├── UsernameInput.tsx               ← live availability check
│   │   └── OnboardingWizard.tsx
│   └── consent/
│       └── ConsentCheckbox.tsx
└── docs/
    └── profile-system-spec.md              ← THIS FILE
```

---

## 10. Test plan (handoff checklist)

The coding agent should produce tests for:

1. **DB constraints** — try inserting reserved username, invalid format, denomination not in enum, bio >240 chars → expect rejection.
2. **RLS** — anonymous user, authenticated user, moderator each query `profiles` and verify visibility rules with `members_only` and `private` rows.
3. **Username cooldown** — change once, try second change within 30 days → fail with `username_change_cooldown`.
4. **Username history** — change username, try to take old name from second account within 90 days → fail.
5. **Consent gate** — PATCH `/api/profile/me` with `denomination: 'pingst'` while `consent_special_category_at IS NULL` → 403.
6. **Anonymization RPC** — call `account_anonymize(uid, true)` → profile fields wiped, testimonies still exist with `is_anonymous=true`.
7. **Avatar upload** — 3 MB file → 413; non-image → 415; valid → 200 with public URL.
8. **Public view** — `/api/profile/[username]` for `private` profile → 404; `members_only` for anon → 404; `members_only` for authed → 200.
9. **GDPR export** — POST `/api/account/export` returns JSON with all user's data and consent_log.
10. **Audit log** — every mutation creates a row.

---

## 11. Open questions to confirm before coding starts

These were assumed in §0 but should be flagged for explicit sign-off:

1. **Onboarding gate or soft prompt?** Spec assumes soft (D1). If gate preferred, add middleware that redirects `onboarding_completed=false` users to `/konto/valkommen` for any non-`/konto/*` route.
2. **Display name format** — Confirm: `first + last` (default), or always require both, or just `first`? Spec stores both separately and lets user toggle via `display_name` field.
3. **Username required at signup?** Spec says optional (UUID fallback). Confirm acceptable, otherwise block onboarding-complete until username set.
4. **Consent version bump policy** — when integritetspolicy changes, do we re-prompt all users on next login, or just show a banner? Spec assumes banner + re-grant only on material changes (Art. 9 fields).
5. **Believer_since wording** — "Min frälsningsdag" can be triggering for some (e.g., long Christian upbringing without single conversion event). Confirm wording or alternative ("Ungefär när jag började gå med Jesus").
6. **Denomination list** — Confirm the 12 options. Specifically: separate `Equmenia` (youth) vs `Equmeniakyrkan` (church)? Spec uses single `equmenia` covering both.
7. **City field** — free text (current) or dropdown of 290 Swedish kommuner? Free text is simpler; dropdown enables aggregation. Spec uses free text for MVP.
8. **Avatar moderation** — manual flag-only acceptable, or do we need automated NSFW classifier (e.g., AWS Rekognition) before launch? Spec assumes manual.
9. **`/u/` vs `/anvandare/`** — Swedish-first site usually prefers Swedish slugs. Spec uses `/u/` for brevity but happy to swap to `/anvandare/[username]`.
10. **Reserved usernames list** — confirm the seeded list in §1.1. Add Christian leader names (Lewi Pethrus, Ulf Ekman, etc.)? Add denomination names as protected?

Send confirmations / overrides for the above and the spec is ready for Cascade/SWE-1.6 to implement end-to-end.
