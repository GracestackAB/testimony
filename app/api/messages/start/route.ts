import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Starta (eller hämta) konversation med en annan användare.
// Body: { user_id?: string, username?: string }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { user_id?: string; username?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let otherId = body.user_id;
  if (!otherId && body.username) {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, deleted_at, is_anonymized")
      .eq("username", body.username)
      .maybeSingle();
    if (!p || p.deleted_at || p.is_anonymized) {
      return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
    }
    otherId = p.id;
  }

  if (!otherId) {
    return NextResponse.json({ error: "missing_recipient" }, { status: 400 });
  }
  if (otherId === user.id) {
    return NextResponse.json({ error: "cannot_message_self" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_other_user: otherId,
  });

  if (error) {
    const msg = error.message ?? "rpc_failed";
    const status =
      msg.includes("blocked") ? 403 :
      msg.includes("recipient_not_found") ? 404 :
      msg.includes("invalid_recipient") ? 400 :
      400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ conversation_id: data });
}
