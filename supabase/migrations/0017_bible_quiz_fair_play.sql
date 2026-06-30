-- Bibel Quiz: rättvis utmaning (samma frågor) + avböj/rematch

alter table testimony.bible_quiz_challenges
  alter column challenger_score drop not null;

alter table testimony.bible_quiz_challenges
  add column if not exists question_seed text;

comment on column testimony.bible_quiz_challenges.question_seed is
  'Deterministic seed for quiz questions — defaults to challenge id';

drop policy if exists bible_quiz_challenges_update on testimony.bible_quiz_challenges;
create policy bible_quiz_challenges_update on testimony.bible_quiz_challenges
  for update to authenticated
  using (challenger_id = auth.uid() or challenged_id = auth.uid())
  with check (challenger_id = auth.uid() or challenged_id = auth.uid());
