import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST { userId } — följ profil. DELETE ?userId= — sluta följa. GET ?userId= — status. */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "missing_user_id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ following: false, authenticated: false });

  const { data } = await supabase
    .from("profile_follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", userId)
    .maybeSingle();

  return NextResponse.json({ following: Boolean(data), authenticated: true });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: "cannot_follow_self" }, { status: 400 });
  }

  const { error } = await supabase.from("profile_follows").insert({
    follower_id: user.id,
    following_id: userId,
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, following: true });
    return NextResponse.json({ error: "follow_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "missing_user_id" }, { status: 400 });

  await supabase
    .from("profile_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", userId);

  return NextResponse.json({ ok: true, following: false });
}
