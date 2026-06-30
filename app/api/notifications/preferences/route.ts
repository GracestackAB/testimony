import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: NotificationType[] = [
  "testimony_published",
  "testimony_rejected",
  "prayer_answer_added",
  "prayer_marked",
  "reaction_received",
  "mod_queue_pending",
  "daily_bible_pending",
  "daily_verse",
  "system",
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .schema("testimony")
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data ?? [] });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = body?.type;
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const update: Record<string, unknown> = { user_id: user.id, type };
  if (typeof body.in_app === "boolean") update.in_app = body.in_app;
  if (typeof body.push === "boolean") update.push = body.push;
  if (typeof body.email === "boolean") update.email = body.email;
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .schema("testimony")
    .from("notification_preferences")
    .upsert(update, { onConflict: "user_id,type" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
