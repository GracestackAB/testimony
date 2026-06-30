import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile/server";
import { validateProfileUpdate } from "@/lib/profile/validation";
import { logAudit } from "@/lib/audit/log";

export async function GET() {
  const profile = await getMyProfile();
  if (!profile) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const profile = await getMyProfile();
  if (!profile) return NextResponse.json({ error: "profile_missing" }, { status: 404 });

  const result = validateProfileUpdate(body, profile.consent_special_category_at !== null);
  if (!result.ok) {
    return NextResponse.json({ error: "validation_failed", errors: result.errors }, { status: 400 });
  }

  // Auto-derive display_name if first/last given but no explicit display_name
  const update: Record<string, unknown> = { ...result.data, updated_at: new Date().toISOString() };
  if (!("display_name" in update) && (update.first_name || update.last_name)) {
    update.display_name = [update.first_name, update.last_name].filter(Boolean).join(" ").trim() || null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    const code = error.message;
    if (code.includes("username_reserved")) return NextResponse.json({ error: "username_reserved" }, { status: 409 });
    if (code.includes("username_change_cooldown")) return NextResponse.json({ error: "username_change_cooldown" }, { status: 409 });
    if (code.includes("username_recently_used")) return NextResponse.json({ error: "username_recently_used" }, { status: 409 });
    if (code.includes("duplicate key")) return NextResponse.json({ error: "username_taken" }, { status: 409 });
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
  }

  await logAudit({
    userId: user.id,
    action: "username" in update ? "username_changed" : "profile_updated",
    metadata: { fields: Object.keys(update) },
    req,
  });

  return NextResponse.json(data);
}
