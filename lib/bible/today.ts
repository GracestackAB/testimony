import { createClient } from "@/lib/supabase/server";

export type DailyBiblePublic = {
  id: string;
  for_date: string;
  reference: string;
  text_body: string;
  explanation: string;
};

/** Senast publicerade dagens bibeltext (idag eller senaste tillgängliga). */
export async function getTodayDailyBible(): Promise<DailyBiblePublic | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: exact } = await supabase
    .from("daily_bible")
    .select("id, for_date, reference, text_body, explanation")
    .eq("status", "published")
    .eq("for_date", today)
    .maybeSingle();

  if (exact) return exact as DailyBiblePublic;

  const { data: latest } = await supabase
    .from("daily_bible")
    .select("id, for_date, reference, text_body, explanation")
    .eq("status", "published")
    .lte("for_date", today)
    .order("for_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as DailyBiblePublic | null) ?? null;
}
