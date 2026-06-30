import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { conversationId: string };

// GET: hämta meddelanden i en konversation
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: c } = await supabase
    .from("conversations")
    .select("id, participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (c.participant_a !== user.id && c.participant_b !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at, deleted_for_sender, deleted_for_recipient")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  return NextResponse.json({ messages: messages ?? [] });
}

// POST: skicka ett nytt meddelande. Body: { body: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let payload: { body?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = (payload.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "empty_body" }, { status: 400 });
  if (body.length > 4000) return NextResponse.json({ error: "too_long" }, { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body })
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .single();

  if (error) {
    const msg = error.message ?? "insert_failed";
    const status =
      msg.includes("blocked") ? 403 :
      msg.includes("not_participant") || msg.includes("forbidden") ? 403 :
      msg.includes("messages_body_length") ? 400 :
      msg.toLowerCase().includes("row-level security") ? 403 :
      400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ message: data });
}
