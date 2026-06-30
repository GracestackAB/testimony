import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logConsent, type ConsentType } from "@/lib/consent/log";
import { logAudit } from "@/lib/audit/log";
import { POLICY_VERSIONS } from "@/lib/profile/constants";

const VALID_TYPES: ConsentType[] = ["tos", "privacy_policy", "special_category_religion", "newsletter"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null) as { consent_type?: string; granted?: boolean; policy_version?: string } | null;
  if (!body || typeof body.granted !== "boolean" || !VALID_TYPES.includes(body.consent_type as ConsentType)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const consentType = body.consent_type as ConsentType;
  const version = body.policy_version || POLICY_VERSIONS[consentType === "special_category_religion" ? "special_category" : consentType === "tos" ? "tos" : consentType === "newsletter" ? "newsletter" : "privacy"];

  await logConsent({ userId: user.id, consentType, granted: body.granted, policyVersion: version, req });

  if (consentType === "special_category_religion") {
    if (body.granted) {
      await supabase
        .from("profiles")
        .update({
          consent_special_category_at: new Date().toISOString(),
          consent_special_category_version: version,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else {
      // Withdrawal: clear special-category fields
      await supabase
        .from("profiles")
        .update({
          consent_special_category_at: null,
          consent_special_category_version: null,
          denomination: null,
          role_in_church: null,
          believer_since: null,
          favorite_verse: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  }

  await logAudit({
    userId: user.id,
    action: body.granted ? "consent_granted" : "consent_withdrawn",
    metadata: { consent_type: consentType, policy_version: version },
    req,
  });

  return NextResponse.json({ ok: true });
}
