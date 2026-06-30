import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hashIp, clientIp } from "@/lib/audit/log";

export type ConsentType =
  | "tos"
  | "privacy_policy"
  | "special_category_religion"
  | "newsletter";

export async function logConsent(opts: {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  policyVersion: string;
  req?: Request;
}) {
  const supabase = await createClient();
  await supabase.from("consent_log").insert({
    user_id: opts.userId,
    consent_type: opts.consentType,
    granted: opts.granted,
    policy_version: opts.policyVersion,
    ip_hash: opts.req ? hashIp(clientIp(opts.req)) : null,
    user_agent: opts.req?.headers.get("user-agent") ?? null,
    withdrawn_at: opts.granted ? null : new Date().toISOString(),
  });
}
