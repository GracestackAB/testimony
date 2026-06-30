import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateVisibility } from "@/lib/profile/validation";
import { logAudit } from "@/lib/audit/log";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = validateVisibility(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation_failed", errors: result.errors }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (result.profileVisibility) update.profile_visibility = result.profileVisibility;
  if (result.fieldVisibility) {
    // Merge with existing
    const { data: current } = await supabase
      .from("profiles")
      .select("field_visibility")
      .eq("id", user.id)
      .maybeSingle();
    update.field_visibility = { ...(current?.field_visibility ?? {}), ...result.fieldVisibility };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select("profile_visibility, field_visibility")
    .single();

  if (error) {
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
  }

  await logAudit({ userId: user.id, action: "privacy_changed", metadata: update, req });
  return NextResponse.json(data);
}
