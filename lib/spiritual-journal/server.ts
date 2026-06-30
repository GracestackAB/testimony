import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SpiritualJournalCategory, SpiritualJournalEntry } from "./types";

export async function requireJournalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function listJournalEntries(
  category?: SpiritualJournalCategory
): Promise<SpiritualJournalEntry[]> {
  const { supabase, user } = await requireJournalUser();
  if (!user) return [];

  let query = supabase
    .from("spiritual_journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SpiritualJournalEntry[];
}

export async function countJournalEntriesByCategory(): Promise<Record<string, number>> {
  const { supabase, user } = await requireJournalUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("spiritual_journal_entries")
    .select("category")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const cat = row.category as string;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
}
