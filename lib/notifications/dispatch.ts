import "server-only";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:gracestackab@gmail.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin_env");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "testimony" },
  });
}

type OutboxRow = {
  id: string;
  notification_id: string;
  channel: "push" | "email";
  attempts: number;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://testimony.se";

async function sendPush(n: NotificationRow): Promise<{ ok: boolean; error?: string }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { ok: false, error: "vapid_not_configured" };
  const supa = adminClient();
  const { data: subs, error } = await supa
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", n.user_id);
  if (error) return { ok: false, error: error.message };
  if (!subs || subs.length === 0) return { ok: false, error: "no_subscriptions" };

  const payload = JSON.stringify({
    title: n.title,
    body: n.body ?? "",
    url: n.action_url ? new URL(n.action_url, SITE_URL).toString() : SITE_URL,
    icon: "/icon-192.png?v=2",
    badge: "/icon-192.png?v=2",
    tag: n.type,
    data: { notificationId: n.id, type: n.type },
  });

  const deadEndpoints: string[] = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.push(s.endpoint);
        }
      }
    })
  );
  if (deadEndpoints.length > 0) {
    await supa.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
  }
  return sent > 0 ? { ok: true } : { ok: false, error: "all_endpoints_failed" };
}

async function sendEmail(n: NotificationRow): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "resend_not_configured" };
  const supa = adminClient();
  // Get user email from auth.users via admin
  const { data: userRow } = await supa.auth.admin.getUserById(n.user_id);
  const email = userRow?.user?.email;
  if (!email) return { ok: false, error: "no_user_email" };

  const url = n.action_url ? new URL(n.action_url, SITE_URL).toString() : SITE_URL;
  const html = `<!DOCTYPE html><html><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c1917;">
    <h1 style="font-size: 22px; margin: 0 0 12px; font-family: Georgia, serif;">${escapeHtml(n.title)}</h1>
    ${n.body ? `<p style="font-size: 16px; line-height: 1.5; margin: 0 0 24px; color: #44403c;">${escapeHtml(n.body)}</p>` : ""}
    <p style="margin: 24px 0;"><a href="${url}" style="display: inline-block; background: #5f7438; color: #faf8f3; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Öppna i testimony.se</a></p>
    <hr style="border: 0; border-top: 1px solid #e7e5e4; margin: 32px 0 16px;" />
    <p style="font-size: 12px; color: #78716c;">Du fick det här mailet eftersom du valt att få e-postnotiser från testimony.se. <a href="${SITE_URL}/konto/notiser" style="color: #5f7438;">Hantera dina notiser</a>.</p>
  </body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "testimony.se <noreply@testimony.se>",
      to: [email],
      subject: n.title,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `resend_${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export async function processOutbox(limit = 50): Promise<{ processed: number; sent: number; failed: number }> {
  const supa = adminClient();
  const { data: rows } = await supa
    .from("notification_outbox")
    .select("id, notification_id, channel, attempts")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (!rows || rows.length === 0) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const row of rows as OutboxRow[]) {
    const { data: n } = await supa
      .from("notifications")
      .select("id, user_id, type, title, body, action_url")
      .eq("id", row.notification_id)
      .single();
    if (!n) {
      await supa.from("notification_outbox").update({ status: "skipped", last_error: "notification_missing" }).eq("id", row.id);
      continue;
    }

    const result =
      row.channel === "push"
        ? await sendPush(n as NotificationRow)
        : await sendEmail(n as NotificationRow);

    if (result.ok) {
      await supa
        .from("notification_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
        .eq("id", row.id);
      sent++;
    } else {
      const finalFail = row.attempts + 1 >= 3;
      await supa
        .from("notification_outbox")
        .update({
          status: finalFail ? "failed" : "pending",
          last_error: result.error ?? "unknown",
          attempts: row.attempts + 1,
          scheduled_for: finalFail ? new Date().toISOString() : new Date(Date.now() + 60_000 * (row.attempts + 1) ** 2).toISOString(),
        })
        .eq("id", row.id);
      failed++;
    }
  }

  return { processed: rows.length, sent, failed };
}
