import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

export type AuditAction =
  | "profile_created"
  | "profile_updated"
  | "username_changed"
  | "consent_granted"
  | "consent_withdrawn"
  | "data_exported"
  | "account_deleted"
  | "account_anonymized"
  | "avatar_uploaded"
  | "avatar_deleted"
  | "login"
  | "privacy_changed";

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.AUDIT_IP_SALT || "testimony-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function logAudit(opts: {
  userId: string | null;
  action: AuditAction;
  metadata?: Record<string, unknown>;
  req?: Request;
}) {
  try {
    const supabase = await createServiceClient();
    await supabase.from("audit_log").insert({
      user_id: opts.userId,
      action: opts.action,
      metadata: opts.metadata ?? {},
      ip_hash: opts.req ? hashIp(clientIp(opts.req)) : null,
      user_agent: opts.req?.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    console.error("[audit_log] failed", err);
  }
}
