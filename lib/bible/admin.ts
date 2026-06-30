import { createServiceClient } from "@/lib/supabase/server";

/** Antal AI-genererade bibeltexter som väntar på godkännande. */
export async function getPendingDailyBibleCount(): Promise<number> {
  const svc = await createServiceClient();
  const { count } = await svc
    .from("daily_bible")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}
