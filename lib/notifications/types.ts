export type NotificationType =
  | "testimony_published"
  | "testimony_rejected"
  | "prayer_answer_added"
  | "prayer_marked"
  | "reaction_received"
  | "mod_queue_pending"
  | "daily_bible_pending"
  | "daily_verse"
  | "dm_received"
  | "quiz_challenge"
  | "quiz_challenge_result"
  | "system";

export const NOTIFICATION_TYPES: { value: NotificationType; label: string; description: string }[] = [
  { value: "testimony_published", label: "Vittnesbörd publicerat", description: "När ditt vittnesbörd har granskats och publicerats" },
  { value: "testimony_rejected", label: "Vittnesbörd kräver ändringar", description: "När en moderator behöver att du ändrar något" },
  { value: "prayer_answer_added", label: "Bönesvar på mitt böneämne", description: "När någon delar ett bönesvar för ditt böneämne" },
  { value: "prayer_marked", label: "Någon ber för mig", description: "När någon markerar att de ber för ditt böneämne" },
  { value: "reaction_received", label: "Halleluja-reaktion", description: "När någon prisar Gud för det du delat" },
  { value: "mod_queue_pending", label: "Granskningskö (moderator)", description: "När något läggs till i granskningskön — visas bara om du är moderator" },
  { value: "daily_bible_pending", label: "Bibeltext att granska (moderator)", description: "När AI genererat en ny dagens bibeltext som väntar godkännande" },
  { value: "daily_verse", label: "Dagens bibeltext", description: "Daglig påminnelse om dagens bibeltext (kommer i nästa version)" },
  { value: "dm_received", label: "Direktmeddelande", description: "När någon skickar dig ett personligt meddelande" },
  { value: "quiz_challenge", label: "Bibel Quiz-utmaning", description: "När någon utmanar dig i Bibel Quiz" },
  { value: "quiz_challenge_result", label: "Bibel Quiz-resultat", description: "När en utmaning du skickat är avgjord" },
  { value: "system", label: "Systemmeddelanden", description: "Viktiga meddelanden från testimony.se" },
];

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  action_url: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreference = {
  user_id: string;
  type: NotificationType;
  in_app: boolean;
  push: boolean;
  email: boolean;
};
