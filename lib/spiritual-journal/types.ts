/** Kategorier för privat andakt — synkas med DB-enum. */
export const SPIRITUAL_JOURNAL_CATEGORIES = [
  "gratitude",
  "prayer",
  "confession",
  "reflection",
  "promise",
  "scripture",
  "answered_prayer",
  "growth",
] as const;

export type SpiritualJournalCategory = (typeof SPIRITUAL_JOURNAL_CATEGORIES)[number];

export function isSpiritualJournalCategory(value: string): value is SpiritualJournalCategory {
  return (SPIRITUAL_JOURNAL_CATEGORIES as readonly string[]).includes(value);
}

export type SpiritualJournalEntry = {
  id: string;
  user_id: string;
  category: SpiritualJournalCategory;
  title: string | null;
  body: string;
  scripture_ref: string | null;
  entry_date: string;
  is_pinned: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateJournalEntryInput = {
  category: SpiritualJournalCategory;
  body: string;
  title?: string | null;
  scripture_ref?: string | null;
  entry_date?: string;
  is_pinned?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateJournalEntryInput = Partial<
  Pick<CreateJournalEntryInput, "body" | "title" | "scripture_ref" | "entry_date" | "is_pinned" | "metadata">
>;
