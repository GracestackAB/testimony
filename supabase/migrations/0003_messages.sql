-- testimony.se · Direktmeddelanden (DM) mellan användare
-- Konversationer mellan exakt två deltagare (1:1 chat).
-- Kanonisk ordning: participant_a < participant_b (uuid-jämförelse) → garanterar unik konversation per par.

set search_path = testimony, public;

-- Lägg till 'dm_received' i notification_type-enum
alter type testimony.notification_type add value if not exists 'dm_received';

-- ============================================================
-- Tabeller
-- ============================================================

create table if not exists testimony.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  last_sender_id uuid references auth.users(id) on delete set null,
  a_unread_count int not null default 0,
  b_unread_count int not null default 0,
  a_archived boolean not null default false,
  b_archived boolean not null default false,
  constraint conversations_participants_ordered check (participant_a < participant_b),
  constraint conversations_participants_distinct check (participant_a <> participant_b),
  constraint conversations_unique_pair unique (participant_a, participant_b)
);

create index if not exists conversations_participant_a_idx
  on testimony.conversations(participant_a, last_message_at desc);
create index if not exists conversations_participant_b_idx
  on testimony.conversations(participant_b, last_message_at desc);

create table if not exists testimony.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references testimony.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_for_sender boolean not null default false,
  deleted_for_recipient boolean not null default false,
  constraint messages_body_length check (char_length(body) between 1 and 4000)
);

create index if not exists messages_conversation_idx
  on testimony.messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx
  on testimony.messages(sender_id, created_at desc);

-- Block-funktion: en användare kan blockera en annan
create table if not exists testimony.message_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint message_blocks_distinct check (blocker_id <> blocked_id)
);

create index if not exists message_blocks_blocked_idx
  on testimony.message_blocks(blocked_id);

-- ============================================================
-- Hjälpfunktion: kanoniskt par
-- ============================================================
create or replace function testimony._canonical_pair(u1 uuid, u2 uuid)
returns table(a uuid, b uuid)
language sql immutable as $$
  select case when u1 < u2 then u1 else u2 end,
         case when u1 < u2 then u2 else u1 end
$$;

-- ============================================================
-- RPC: hämta eller skapa konversation med en annan användare
-- ============================================================
create or replace function testimony.get_or_create_conversation(p_other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = testimony, public
as $$
declare
  v_caller uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
  v_blocked boolean;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_other_user is null or p_other_user = v_caller then
    raise exception 'invalid_recipient';
  end if;

  -- Kontrollera blockering åt båda håll
  select exists(
    select 1 from testimony.message_blocks
    where (blocker_id = v_caller and blocked_id = p_other_user)
       or (blocker_id = p_other_user and blocked_id = v_caller)
  ) into v_blocked;
  if v_blocked then
    raise exception 'blocked';
  end if;

  -- Mottagare måste vara en riktig profil (inte raderad/anonymiserad)
  if not exists (
    select 1 from testimony.profiles
    where id = p_other_user
      and deleted_at is null
      and is_anonymized = false
  ) then
    raise exception 'recipient_not_found';
  end if;

  select a, b into v_a, v_b from testimony._canonical_pair(v_caller, p_other_user);

  insert into testimony.conversations (participant_a, participant_b)
  values (v_a, v_b)
  on conflict (participant_a, participant_b) do update
    set participant_a = excluded.participant_a
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function testimony.get_or_create_conversation(uuid) from public;
grant execute on function testimony.get_or_create_conversation(uuid) to authenticated;

-- ============================================================
-- Trigger: vid ny message → uppdatera conversation + skapa notis
-- ============================================================
create or replace function testimony._on_new_message()
returns trigger
language plpgsql
security definer
set search_path = testimony, public
as $$
declare
  v_conv testimony.conversations%rowtype;
  v_recipient uuid;
  v_sender_name text;
  v_preview text;
  v_blocked boolean;
begin
  select * into v_conv from testimony.conversations where id = new.conversation_id;
  if not found then
    raise exception 'conversation_missing';
  end if;

  -- Validera att sender är deltagare
  if new.sender_id <> v_conv.participant_a and new.sender_id <> v_conv.participant_b then
    raise exception 'sender_not_participant';
  end if;

  v_recipient := case when new.sender_id = v_conv.participant_a
                      then v_conv.participant_b
                      else v_conv.participant_a end;

  -- Blockerings-check (extra skydd vid skick)
  select exists(
    select 1 from testimony.message_blocks
    where (blocker_id = v_recipient and blocked_id = new.sender_id)
       or (blocker_id = new.sender_id and blocked_id = v_recipient)
  ) into v_blocked;
  if v_blocked then
    raise exception 'blocked';
  end if;

  v_preview := substring(new.body from 1 for 140);

  update testimony.conversations
  set last_message_at = new.created_at,
      last_message_preview = v_preview,
      last_sender_id = new.sender_id,
      a_unread_count = case when v_recipient = participant_a then a_unread_count + 1 else a_unread_count end,
      b_unread_count = case when v_recipient = participant_b then b_unread_count + 1 else b_unread_count end,
      a_archived = case when participant_a = new.sender_id then a_archived else false end,
      b_archived = case when participant_b = new.sender_id then b_archived else false end
  where id = new.conversation_id;

  -- Skapa notis till mottagaren (typ 'system' tills vi lägger till 'dm_received' i NotificationType)
  select coalesce(display_name, username, 'Någon') into v_sender_name
    from testimony.profiles where id = new.sender_id;

  insert into testimony.notifications (user_id, type, title, body, action_url, actor_id, metadata)
  values (
    v_recipient,
    'dm_received',
    coalesce(v_sender_name, 'Nytt meddelande') || ' skickade ett meddelande',
    v_preview,
    '/meddelanden/' || new.conversation_id::text,
    new.sender_id,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists trg_on_new_message on testimony.messages;
create trigger trg_on_new_message
after insert on testimony.messages
for each row execute function testimony._on_new_message();

-- ============================================================
-- Lägg till 'dm_received' som tillåten notification-typ
-- (notifications.type är text, så ingen enum-ändring behövs)
-- ============================================================
-- Skapa preferens-rader för befintliga användare
insert into testimony.notification_preferences (user_id, type, in_app, push, email)
select id, 'dm_received', true, true, false
from testimony.profiles
on conflict (user_id, type) do nothing;

-- ============================================================
-- Mark conversation as read (RPC)
-- ============================================================
create or replace function testimony.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = testimony, public
as $$
declare
  v_caller uuid := auth.uid();
  v_conv testimony.conversations%rowtype;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_conv from testimony.conversations where id = p_conversation_id;
  if not found then
    raise exception 'conversation_not_found';
  end if;
  if v_caller <> v_conv.participant_a and v_caller <> v_conv.participant_b then
    raise exception 'not_participant';
  end if;

  update testimony.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_caller
    and read_at is null;

  update testimony.conversations
  set a_unread_count = case when v_caller = participant_a then 0 else a_unread_count end,
      b_unread_count = case when v_caller = participant_b then 0 else b_unread_count end
  where id = p_conversation_id;

  -- Markera dm-notiser som lästa
  update testimony.notifications
  set read_at = now()
  where user_id = v_caller
    and type = 'dm_received'
    and read_at is null
    and (metadata->>'conversation_id')::uuid = p_conversation_id;
end;
$$;

revoke all on function testimony.mark_conversation_read(uuid) from public;
grant execute on function testimony.mark_conversation_read(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table testimony.conversations enable row level security;
alter table testimony.messages enable row level security;
alter table testimony.message_blocks enable row level security;

-- Conversations: deltagare kan läsa
drop policy if exists conversations_participant_read on testimony.conversations;
create policy conversations_participant_read on testimony.conversations
  for select using (auth.uid() = participant_a or auth.uid() = participant_b);

-- Conversations: deltagare kan uppdatera (för arkivering, men inte ändra deltagare)
drop policy if exists conversations_participant_update on testimony.conversations;
create policy conversations_participant_update on testimony.conversations
  for update using (auth.uid() = participant_a or auth.uid() = participant_b)
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

-- Inga insert-policies — endast via RPC get_or_create_conversation (security definer)

-- Messages: deltagare kan läsa
drop policy if exists messages_participant_read on testimony.messages;
create policy messages_participant_read on testimony.messages
  for select using (
    exists (
      select 1 from testimony.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
    and (
      (sender_id = auth.uid() and deleted_for_sender = false)
      or (sender_id <> auth.uid() and deleted_for_recipient = false)
    )
  );

-- Messages: deltagare kan skicka som sig själv
drop policy if exists messages_participant_insert on testimony.messages;
create policy messages_participant_insert on testimony.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from testimony.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- Messages: avsändare kan radera sina egna (soft delete via update)
drop policy if exists messages_self_update on testimony.messages;
create policy messages_self_update on testimony.messages
  for update using (
    exists (
      select 1 from testimony.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from testimony.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- Message blocks: ägaren styr sina egna
drop policy if exists message_blocks_self_read on testimony.message_blocks;
create policy message_blocks_self_read on testimony.message_blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists message_blocks_self_insert on testimony.message_blocks;
create policy message_blocks_self_insert on testimony.message_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists message_blocks_self_delete on testimony.message_blocks;
create policy message_blocks_self_delete on testimony.message_blocks
  for delete using (auth.uid() = blocker_id);

-- Realtime: lägg till messages och conversations i publication så Supabase Realtime kan strömma
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table testimony.messages';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table testimony.conversations';
    exception when duplicate_object then null;
    end;
  end if;
end$$;
