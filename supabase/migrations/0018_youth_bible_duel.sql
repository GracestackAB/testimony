-- Bibel-Duell (ungdomar): poäng, topplista och 1v1-utmaningar

create table if not exists testimony.youth_bible_duel_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  locale text not null check (locale in ('sv', 'en')),
  score int not null check (score >= 0),
  total int not null default 8 check (total > 0 and score <= total),
  played_at timestamptz not null default now()
);

create index if not exists youth_bible_duel_scores_user_locale_idx
  on testimony.youth_bible_duel_scores (user_id, locale, played_at desc);

create index if not exists youth_bible_duel_scores_week_idx
  on testimony.youth_bible_duel_scores (locale, played_at desc, score desc);

create table if not exists testimony.youth_bible_duel_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users (id) on delete cascade,
  challenged_id uuid not null references auth.users (id) on delete cascade,
  locale text not null check (locale in ('sv', 'en')),
  challenger_score int check (challenger_score is null or challenger_score >= 0),
  challenged_score int check (challenged_score is null or challenged_score >= 0),
  total int not null default 8,
  question_seed text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint youth_bible_duel_challenges_not_self check (challenger_id <> challenged_id)
);

create index if not exists youth_bible_duel_challenges_challenged_idx
  on testimony.youth_bible_duel_challenges (challenged_id, status, created_at desc);

create index if not exists youth_bible_duel_challenges_challenger_idx
  on testimony.youth_bible_duel_challenges (challenger_id, created_at desc);

alter table testimony.youth_bible_duel_scores enable row level security;
alter table testimony.youth_bible_duel_challenges enable row level security;

drop policy if exists youth_bible_duel_scores_insert on testimony.youth_bible_duel_scores;
create policy youth_bible_duel_scores_insert on testimony.youth_bible_duel_scores
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists youth_bible_duel_scores_select on testimony.youth_bible_duel_scores;
create policy youth_bible_duel_scores_select on testimony.youth_bible_duel_scores
  for select to authenticated
  using (true);

drop policy if exists youth_bible_duel_challenges_select on testimony.youth_bible_duel_challenges;
create policy youth_bible_duel_challenges_select on testimony.youth_bible_duel_challenges
  for select to authenticated
  using (challenger_id = auth.uid() or challenged_id = auth.uid());

drop policy if exists youth_bible_duel_challenges_insert on testimony.youth_bible_duel_challenges;
create policy youth_bible_duel_challenges_insert on testimony.youth_bible_duel_challenges
  for insert to authenticated
  with check (challenger_id = auth.uid());

drop policy if exists youth_bible_duel_challenges_update on testimony.youth_bible_duel_challenges;
create policy youth_bible_duel_challenges_update on testimony.youth_bible_duel_challenges
  for update to authenticated
  using (challenger_id = auth.uid() or challenged_id = auth.uid())
  with check (challenger_id = auth.uid() or challenged_id = auth.uid());

grant select, insert on testimony.youth_bible_duel_scores to authenticated, service_role;
grant select, insert, update on testimony.youth_bible_duel_challenges to authenticated, service_role;
