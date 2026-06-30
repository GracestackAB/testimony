import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function assembleExport(userId: string) {
  const supabase = await createClient();

  const [profile, testimonies, prayerRequests, prayerAnswers, gratitudes, journalEntries, reactions, applications, donations, consentLog, auditLog] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("testimonies").select("*").eq("author_id", userId),
      supabase.from("prayer_requests").select("*").eq("author_id", userId),
      supabase.from("prayer_answers").select("*").eq("author_id", userId),
      supabase.from("gratitudes").select("*").eq("author_id", userId),
      supabase.from("spiritual_journal_entries").select("*").eq("user_id", userId),
      supabase.from("reactions").select("*").eq("user_id", userId),
      supabase.from("volunteer_applications").select("*").eq("user_id", userId),
      supabase
        .from("donations")
        .select("id, tier, amount_sek_cents, status, current_period_end, created_at")
        .eq("user_id", userId),
      supabase.from("consent_log").select("*").eq("user_id", userId),
      supabase
        .from("audit_log")
        .select("id, action, metadata, created_at")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 90 * 86400 * 1000).toISOString()),
    ]);

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile.data ?? null,
    testimonies: testimonies.data ?? [],
    prayer_requests: prayerRequests.data ?? [],
    prayer_answers: prayerAnswers.data ?? [],
    gratitudes: gratitudes.data ?? [],
    spiritual_journal_entries: journalEntries.data ?? [],
    reactions: reactions.data ?? [],
    volunteer_applications: applications.data ?? [],
    donations: donations.data ?? [],
    consent_log: consentLog.data ?? [],
    audit_log_last_90_days: auditLog.data ?? [],
    metadata: {
      schema_version: "phase1.v2",
      service: "testimony.se",
      controller: "Gracestack AB, Stockholm",
    },
  };
}
