import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null) as { keep_contributions?: boolean; confirm?: string } | null;
  if (!body || body.confirm !== "RADERA") {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }
  const keep = body.keep_contributions !== false;

  // Step 1: anonymize / delete content via RPC
  const { error: rpcErr } = await supabase.rpc("account_anonymize", {
    p_user_id: user.id,
    p_keep_contributions: keep,
  });
  if (rpcErr) {
    return NextResponse.json({ error: "anonymize_failed", message: rpcErr.message }, { status: 500 });
  }

  // Step 2: clean up avatar storage
  try {
    const { data: list } = await supabase.storage.from("avatars").list(user.id);
    if (list && list.length > 0) {
      await supabase.storage.from("avatars").remove(list.map((f) => `${user.id}/${f.name}`));
    }
  } catch (err) {
    console.error("avatar cleanup failed", err);
  }

  await logAudit({ userId: user.id, action: "account_deleted", metadata: { keep_contributions: keep }, req });

  // Step 3: delete the auth user via service role
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const service = await createServiceClient();
      await service.auth.admin.deleteUser(user.id);
    } catch (err) {
      console.error("auth.admin.deleteUser failed", err);
    }
  }

  // Sign out current session
  await supabase.auth.signOut();
  return NextResponse.json({ status: "deleted" });
}
