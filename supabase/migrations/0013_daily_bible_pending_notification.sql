-- Notistyp när AI-genererad dagens bibeltext väntar moderator-godkännande
alter type testimony.notification_type add value if not exists 'daily_bible_pending';

insert into testimony.notification_preferences (user_id, type, in_app, push, email)
select id, 'daily_bible_pending', true, true, false
from testimony.profiles
where is_moderator = true
on conflict (user_id, type) do nothing;
