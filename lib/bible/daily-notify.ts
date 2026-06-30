/**
 * Notiser till moderator om dagens bibeltext (fel eller granskning).
 */
import { sendEmail, emailTemplate } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.testimony.se";

async function notifyModeratorsInApp(
  title: string,
  body: string,
  actionUrl: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const svc = await createServiceClient();
  const { data: moderators } = await svc
    .from("profiles")
    .select("id")
    .eq("is_moderator", true);

  if (!moderators?.length) return;

  const rows = moderators.map((m: { id: string }) => ({
    user_id: m.id,
    type: "daily_bible_pending" as const,
    title,
    body,
    action_url: actionUrl,
    metadata,
  }));

  const { error } = await svc.from("notifications").insert(rows);
  if (error) {
    console.error("[daily-notify] in-app notification failed:", error.message);
  }
}

export async function notifyDailyBibleFailure(forDate: string, error: string): Promise<void> {
  const to = process.env.MODERATOR_EMAIL;
  const html = emailTemplate({
    heading: "Dagens bibeltext misslyckades",
    body: `<p>Automatisk publicering för <strong>${forDate}</strong> misslyckades.</p>
<p style="font-family:monospace;font-size:13px;background:#f5f0e6;padding:12px;border-radius:8px">${error.slice(0, 500)}</p>
<p>Kör manuellt om det behövs:</p>
<pre style="font-size:12px;overflow:auto">curl -H "Authorization: Bearer $CRON_SECRET" "${SITE_URL}/api/cron/daily-bible?force=1"</pre>`,
    ctaUrl: `${SITE_URL}/admin/bibeltexter`,
    ctaLabel: "Admin — bibeltexter",
  });

  if (to) {
    const result = await sendEmail({
      to,
      subject: `[testimony.se] Dagens bibeltext misslyckades (${forDate})`,
      html,
      text: `Dagens bibeltext för ${forDate} misslyckades: ${error}`,
    });
    if (!result.ok) {
      console.error("[daily-notify] failure email failed:", result.error);
    }
  }

  await notifyModeratorsInApp(
    "Dagens bibeltext misslyckades",
    `Generering för ${forDate} misslyckades. Öppna admin för att köra om.`,
    "/admin/bibeltexter",
    { for_date: forDate, error: error.slice(0, 500), kind: "failure" }
  );
}

export async function notifyDailyBiblePendingReview(
  forDate: string,
  reference: string,
  bibleId: string
): Promise<void> {
  const to = process.env.MODERATOR_EMAIL;
  const html = emailTemplate({
    heading: "Ny bibeltext väntar granskning",
    body: `<p>AI har genererat bibeltext för <strong>${forDate}</strong> (${reference}).</p>
<p>Granska och godkänn innan den publiceras på sajten.</p>`,
    ctaUrl: `${SITE_URL}/admin/bibeltexter#pending`,
    ctaLabel: "Granska i admin",
  });

  if (to) {
    const result = await sendEmail({
      to,
      subject: `[testimony.se] Bibeltext att granska (${forDate})`,
      html,
      text: `Ny bibeltext för ${forDate} (${reference}) väntar granskning.`,
    });
    if (!result.ok) {
      console.error("[daily-notify] pending review email failed:", result.error);
    }
  }

  await notifyModeratorsInApp(
    "Ny bibeltext att granska",
    `${reference} för ${forDate} — godkänn innan den publiceras.`,
    "/admin/bibeltexter#pending",
    { for_date: forDate, reference, bible_id: bibleId, kind: "pending_review" }
  );
}
