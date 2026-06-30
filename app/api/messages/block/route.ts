import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Body: { user_id: string, action: "block" | "unblock" }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { user_id?: string; action?: "block" | "unblock" } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.user_id || body.user_id === user.id) {
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });
  }

  if (body.action === "unblock") {
    const { error } = await supabase
      .from("message_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", body.user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("message_blocks")
    .insert({ blocker_id: user.id, blocked_id: body.user_id });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
