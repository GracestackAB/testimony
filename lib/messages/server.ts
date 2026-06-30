import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConversationSummary, Message } from "./types";

export async function getMyConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: convs } = await supabase
    .from("conversations")
    .select(
      "id, created_at, last_message_at, last_message_preview, last_sender_id, participant_a, participant_b, a_unread_count, b_unread_count, a_archived, b_archived"
    )
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (!convs || convs.length === 0) return [];

  const otherIds = Array.from(
    new Set(
      convs.map((c) => (c.participant_a === user.id ? c.participant_b : c.participant_a))
    )
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", otherIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return convs.map((c) => {
    const isA = c.participant_a === user.id;
    const otherId = isA ? c.participant_b : c.participant_a;
    const p = profileMap.get(otherId);
    return {
      id: c.id,
      created_at: c.created_at,
      last_message_at: c.last_message_at,
      last_message_preview: c.last_message_preview,
      last_sender_id: c.last_sender_id,
      unread_count: isA ? c.a_unread_count : c.b_unread_count,
      archived: isA ? c.a_archived : c.b_archived,
      other: {
        id: otherId,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      },
    };
  });
}

export async function getMyTotalUnreadMessages(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("conversations")
    .select("participant_a, participant_b, a_unread_count, b_unread_count")
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);
  if (!data) return 0;
  return data.reduce((sum, c) => {
    return sum + (c.participant_a === user.id ? c.a_unread_count : c.b_unread_count);
  }, 0);
}

export async function getConversationWithOther(
  conversationId: string
): Promise<{
  conversation: { id: string; participant_a: string; participant_b: string } | null;
  other: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
  isParticipant: boolean;
  myUserId: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { conversation: null, other: null, isParticipant: false, myUserId: null };

  const { data: c } = await supabase
    .from("conversations")
    .select("id, participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (!c) return { conversation: null, other: null, isParticipant: false, myUserId: user.id };

  const isParticipant = c.participant_a === user.id || c.participant_b === user.id;
  if (!isParticipant) return { conversation: c, other: null, isParticipant: false, myUserId: user.id };

  const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
  const { data: p } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", otherId)
    .maybeSingle();

  return {
    conversation: c,
    other: p
      ? { id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url }
      : { id: otherId, username: null, display_name: null, avatar_url: null },
    isParticipant: true,
    myUserId: user.id,
  };
}

export async function getMessagesForConversation(
  conversationId: string,
  limit = 100
): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at, deleted_for_sender, deleted_for_recipient")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as Message[];
}

export async function isUserBlockedByMe(otherId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("message_blocks")
    .select("blocker_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherId)
    .maybeSingle();
  return Boolean(data);
}
