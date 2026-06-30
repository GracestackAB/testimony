export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_for_sender: boolean;
  deleted_for_recipient: boolean;
};

export type ConversationParticipant = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ConversationSummary = {
  id: string;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_sender_id: string | null;
  unread_count: number;
  archived: boolean;
  other: ConversationParticipant;
};
