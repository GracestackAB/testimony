/**
 * Resend email-wrapper. Tyst no-op om RESEND_API_KEY saknas (lokal dev).
 */

const RESEND_URL = "https://api.resend.com/emails";
const FROM_DEFAULT = "testimony.se <noreply@gracestack.se>";
const REPLY_TO_DEFAULT = "kim@gracestack.se";

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export async function sendEmail(args: SendEmailArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY saknas — skippar utskick", args.subject);
    return { ok: false, error: "no_api_key" };
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from || FROM_DEFAULT,
        reply_to: args.replyTo || REPLY_TO_DEFAULT,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend fel:", res.status, err);
      return { ok: false, error: `resend_${res.status}` };
    }
    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (err: any) {
    console.error("[email] kastat fel:", err?.message);
    return { ok: false, error: err?.message || "unknown" };
  }
}

/**
 * Bygger en enkel parchment-template kring innehåll.
 */
export function emailTemplate(opts: { heading: string; body: string; ctaUrl?: string; ctaLabel?: string }): string {
  const { heading, body, ctaUrl, ctaLabel } = opts;
  const cta = ctaUrl
    ? `<p style="margin:32px 0;text-align:center"><a href="${ctaUrl}" style="display:inline-block;background:#5e6b3a;color:#f5f0e6;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600">${ctaLabel || "Öppna"}</a></p>`
    : "";
  return `<!DOCTYPE html><html lang="sv"><body style="margin:0;padding:0;background:#f5f0e6;font-family:Georgia,serif;color:#1c1917">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden">
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #f5f0e6">
          <div style="font-size:14px;letter-spacing:0.18em;text-transform:uppercase;color:#5e6b3a;font-weight:600">testimony.se</div>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#1c1917">${heading}</h1>
          <div style="font-size:16px;line-height:1.6;color:#44403c;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
            ${body}
          </div>
          ${cta}
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f5f0e6;font-size:12px;color:#78716c;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
          testimony.se · Gracestack AB · org.nr 559550-5644
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
