-- testimony.se · Lovsång + Forum
set search_path = testimony, public;

alter type testimony.content_kind add value if not exists 'worship_song';
alter type testimony.content_kind add value if not exists 'forum_thread';
alter type testimony.content_kind add value if not exists 'forum_reply';
