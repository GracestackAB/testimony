import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUsername } from "@/lib/profile/server";
import { USERNAME_COOLDOWN_DAYS } from "@/lib/profile/constants";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u");
  if (!u) return NextResponse.json({ available: false, reason: "invalid_format" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Cooldown check for own user
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, username_changed_at")
      .eq("id", user.id)
      .maybeSingle();
    if (
      profile?.username_changed_at &&
      profile.username?.toLowerCase() !== u.toLowerCase() &&
      new Date(profile.username_changed_at).getTime() > Date.now() - USERNAME_COOLDOWN_DAYS * 86400 * 1000
    ) {
      return NextResponse.json({ available: false, reason: "cooldown" });
    }
  }

  const result = await checkUsername(u, user?.id);
  return NextResponse.json(result);
}
