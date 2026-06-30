-- testimony.se · kärndatamodell (Fas 1)
-- Alla publika tabeller har RLS på. Inget publiceras utan moderation.

-- =========================================================
-- Extensions
-- =========================================================
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =========================================================
-- PROFILER (kopplade till auth.users)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  avatar_url text,
  church text,                  -- församling (frivillig)
  is_moderator boolean not null default false,
  is_org_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-skapa profil när en ny auth-user skapas
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- VERKSAMHETER (katalog – pelare 2)
-- =========================================================
create type public.org_type as enum (
  'forsamling', 'social', 'cafe', 'lager', 'bibelskola', 'boneroerelse', 'annat'
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type public.org_type not null default 'annat',
  city text,
  address text,
  description text,              -- kort (hero)
  about text,                    -- lång "Om oss"
  hero_image_url text,
  website_url text,
  contact_email text,
  contact_phone text,
  hours text,                    -- fritextöppettider
  latitude numeric,
  longitude numeric,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_type_idx on public.organizations(type);
create index if not exists organizations_city_idx on public.organizations(city);

-- Vem administrerar en verksamhet
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'admin',   -- admin | editor | volunteer | pastor
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, role)
);

-- =========================================================
-- FEEDEN – fyra kategorier (pelare 1)
-- =========================================================

-- Gemensam statusmodell: allt startar som "pending" tills moderator godkänner.
create type public.content_status as enum ('draft', 'pending', 'published', 'rejected', 'archived');
create type public.testimony_format as enum ('skriven', 'musik', 'video', 'bildberattelse');

-- VITTNESBÖRD (längre, berättande)
create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  lede text,                        -- ingress
  body text not null,
  format public.testimony_format not null default 'skriven',
  cover_image_url text,
  media_embed_url text,             -- YouTube/Vimeo/Suno
  reading_minutes int,
  author_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default false,
  status public.content_status not null default 'pending',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonies_status_idx on public.testimonies(status, published_at desc);
create index if not exists testimonies_format_idx on public.testimonies(format);

-- BÖNEÄMNEN (det som ligger på hjärtat nu)
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text not null,                        -- max ca 500 tecken (enforced i app)
  author_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default true,
  is_answered boolean not null default false,
  answered_at timestamptz,
  status public.content_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prayer_requests_status_idx on public.prayer_requests(status, created_at desc);

-- BÖNESVAR (kort, konkret, färskt)
create table if not exists public.prayer_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.prayer_requests(id) on delete set null,
  body text not null,                        -- max ca 500 tecken
  author_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default false,
  status public.content_status not null default 'pending',
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists prayer_answers_status_idx on public.prayer_answers(status, published_at desc);

-- DAGENS BIBELTEXT (redaktionellt)
create table if not exists public.daily_bible (
  id uuid primary key default gen_random_uuid(),
  for_date date unique not null,
  reference text not null,                   -- t.ex. "1 Mos 22:1–14"
  text_body text not null,
  explanation text not null,
  author_id uuid references auth.users(id) on delete set null,
  status public.content_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- =========================================================
-- Tagga innehåll till verksamhet (join-tabell)
-- =========================================================
create type public.content_kind as enum ('testimony', 'prayer_request', 'prayer_answer');

create table if not exists public.content_organizations (
  id uuid primary key default gen_random_uuid(),
  content_kind public.content_kind not null,
  content_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (content_kind, content_id, organization_id)
);
create index if not exists content_orgs_lookup_idx on public.content_organizations(organization_id, content_kind);

-- =========================================================
-- Reaktioner
-- =========================================================
create type public.reaction_kind as enum ('praying', 'hallelujah', 'share');

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  content_kind public.content_kind not null,
  content_id uuid not null,
  kind public.reaction_kind not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- En inloggad får räkna som en "praying" per böneämne
  unique (content_kind, content_id, user_id, kind)
);
create index if not exists reactions_content_idx on public.reactions(content_kind, content_id, kind);

-- =========================================================
-- Volontärmodulen (pelare 3)
-- =========================================================
create type public.volunteer_commitment as enum ('engangs', 'veckovis', 'manadsvis', 'lopande');
create type public.volunteer_category as enum (
  'praktiskt','omsorg','barn_ungdom','musik_kreativt','digitalt','administration','forbon'
);
create type public.volunteer_status as enum ('open','filled','paused','archived');
create type public.application_status as enum ('pending','contacted','accepted','declined');

create table if not exists public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null,
  description text not null,
  category public.volunteer_category not null default 'praktiskt',
  commitment public.volunteer_commitment not null default 'engangs',
  location text,                            -- adress eller "digitalt"
  skills_required text,
  background_check_required boolean not null default false,
  contact_user_id uuid references auth.users(id) on delete set null,
  contact_email text,
  status public.volunteer_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vol_opps_org_idx on public.volunteer_opportunities(organization_id);
create index if not exists vol_opps_category_idx on public.volunteer_opportunities(category);
create index if not exists vol_opps_status_idx on public.volunteer_opportunities(status);

create table if not exists public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (opportunity_id, user_id)
);

-- =========================================================
-- Moderationskö
-- =========================================================
create table if not exists public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  content_kind public.content_kind not null,
  content_id uuid not null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision text,                              -- approve | reject
  notes text,
  unique (content_kind, content_id)
);
create index if not exists mod_queue_pending_idx on public.moderation_queue(reviewed_at, submitted_at);

-- Trigger som lägger nya inlägg i moderationskön
create or replace function public.enqueue_for_moderation()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'pending' then
    insert into public.moderation_queue(content_kind, content_id, submitted_by)
    values (tg_argv[0]::public.content_kind, new.id, auth.uid())
    on conflict (content_kind, content_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists enqueue_testimony on public.testimonies;
create trigger enqueue_testimony
after insert on public.testimonies
for each row execute function public.enqueue_for_moderation('testimony');

drop trigger if exists enqueue_prayer_request on public.prayer_requests;
create trigger enqueue_prayer_request
after insert on public.prayer_requests
for each row execute function public.enqueue_for_moderation('prayer_request');

drop trigger if exists enqueue_prayer_answer on public.prayer_answers;
create trigger enqueue_prayer_answer
after insert on public.prayer_answers
for each row execute function public.enqueue_for_moderation('prayer_answer');

-- =========================================================
-- Gåvor (Stripe)
-- =========================================================
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  tier text,                                  -- small | medium | large
  amount_sek_cents int,
  status text,                                -- active | canceled | past_due
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists donations_user_idx on public.donations(user_id);

-- =========================================================
-- RLS-policies
-- =========================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.testimonies enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.prayer_answers enable row level security;
alter table public.daily_bible enable row level security;
alter table public.content_organizations enable row level security;
alter table public.reactions enable row level security;
alter table public.volunteer_opportunities enable row level security;
alter table public.volunteer_applications enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.donations enable row level security;

-- Hjälp: är användaren moderator?
create or replace function public.is_moderator(uid uuid)
returns boolean language sql stable security definer as $$
  select coalesce((select is_moderator from public.profiles where id = uid), false);
$$;

-- Profiler
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (true);                    -- publika displaynamn är ok att visa
drop policy if exists profiles_self_write on public.profiles;
create policy profiles_self_write on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Organizations – publicerade är publika
drop policy if exists organizations_public_read on public.organizations;
create policy organizations_public_read on public.organizations
  for select using (is_published or public.is_moderator(auth.uid()));
drop policy if exists organizations_moderator_write on public.organizations;
create policy organizations_moderator_write on public.organizations
  for all using (public.is_moderator(auth.uid())) with check (public.is_moderator(auth.uid()));

-- Memberships – admin/mod får se
drop policy if exists memberships_self_read on public.memberships;
create policy memberships_self_read on public.memberships
  for select using (auth.uid() = user_id or public.is_moderator(auth.uid()));

-- Publicerat innehåll är publikt; eget innehåll och moderator ser allt
drop policy if exists testimonies_public_read on public.testimonies;
create policy testimonies_public_read on public.testimonies
  for select using (
    status = 'published'
    or auth.uid() = author_id
    or public.is_moderator(auth.uid())
  );
drop policy if exists testimonies_author_insert on public.testimonies;
create policy testimonies_author_insert on public.testimonies
  for insert with check (auth.uid() = author_id and status in ('draft','pending'));
drop policy if exists testimonies_author_update on public.testimonies;
create policy testimonies_author_update on public.testimonies
  for update using (
    (auth.uid() = author_id and status in ('draft','pending','rejected'))
    or public.is_moderator(auth.uid())
  );

drop policy if exists prayer_requests_public_read on public.prayer_requests;
create policy prayer_requests_public_read on public.prayer_requests
  for select using (status = 'published' or auth.uid() = author_id or public.is_moderator(auth.uid()));
drop policy if exists prayer_requests_insert on public.prayer_requests;
create policy prayer_requests_insert on public.prayer_requests
  for insert with check (auth.uid() = author_id and status in ('draft','pending'));
drop policy if exists prayer_requests_update on public.prayer_requests;
create policy prayer_requests_update on public.prayer_requests
  for update using (auth.uid() = author_id or public.is_moderator(auth.uid()));

drop policy if exists prayer_answers_public_read on public.prayer_answers;
create policy prayer_answers_public_read on public.prayer_answers
  for select using (status = 'published' or auth.uid() = author_id or public.is_moderator(auth.uid()));
drop policy if exists prayer_answers_insert on public.prayer_answers;
create policy prayer_answers_insert on public.prayer_answers
  for insert with check (auth.uid() = author_id and status in ('draft','pending'));
drop policy if exists prayer_answers_update on public.prayer_answers;
create policy prayer_answers_update on public.prayer_answers
  for update using (auth.uid() = author_id or public.is_moderator(auth.uid()));

drop policy if exists daily_bible_public_read on public.daily_bible;
create policy daily_bible_public_read on public.daily_bible
  for select using (status = 'published' or public.is_moderator(auth.uid()));
drop policy if exists daily_bible_mod_write on public.daily_bible;
create policy daily_bible_mod_write on public.daily_bible
  for all using (public.is_moderator(auth.uid())) with check (public.is_moderator(auth.uid()));

-- content_organizations – publikt läsbart
drop policy if exists content_orgs_read on public.content_organizations;
create policy content_orgs_read on public.content_organizations for select using (true);
drop policy if exists content_orgs_write on public.content_organizations;
create policy content_orgs_write on public.content_organizations
  for all using (public.is_moderator(auth.uid())) with check (public.is_moderator(auth.uid()));

-- Reactions – alla får läsa aggregat, bara inloggade får reagera
drop policy if exists reactions_read on public.reactions;
create policy reactions_read on public.reactions for select using (true);
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert with check (auth.uid() = user_id);
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions
  for delete using (auth.uid() = user_id);

-- Volontäruppgifter – öppna syns publikt
drop policy if exists vol_opps_read on public.volunteer_opportunities;
create policy vol_opps_read on public.volunteer_opportunities
  for select using (status = 'open' or public.is_moderator(auth.uid())
    or exists (select 1 from public.memberships m
               where m.user_id = auth.uid() and m.organization_id = volunteer_opportunities.organization_id));
drop policy if exists vol_opps_write on public.volunteer_opportunities;
create policy vol_opps_write on public.volunteer_opportunities
  for all using (
    public.is_moderator(auth.uid())
    or exists (select 1 from public.memberships m
               where m.user_id = auth.uid() and m.organization_id = volunteer_opportunities.organization_id
                 and m.role in ('admin','editor'))
  );

drop policy if exists vol_apps_self_read on public.volunteer_applications;
create policy vol_apps_self_read on public.volunteer_applications
  for select using (
    auth.uid() = user_id
    or public.is_moderator(auth.uid())
    or exists (select 1 from public.memberships m
               join public.volunteer_opportunities o on o.organization_id = m.organization_id
               where m.user_id = auth.uid() and o.id = volunteer_applications.opportunity_id)
  );
drop policy if exists vol_apps_insert on public.volunteer_applications;
create policy vol_apps_insert on public.volunteer_applications
  for insert with check (auth.uid() = user_id);

-- Moderation – enbart moderator
drop policy if exists mod_queue_read on public.moderation_queue;
create policy mod_queue_read on public.moderation_queue
  for all using (public.is_moderator(auth.uid())) with check (public.is_moderator(auth.uid()));

-- Donations – bara ägaren ser sin egen
drop policy if exists donations_self_read on public.donations;
create policy donations_self_read on public.donations
  for select using (auth.uid() = user_id or public.is_moderator(auth.uid()));
