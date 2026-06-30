import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/profile/constants";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large", max: AVATAR_MAX_BYTES }, { status: 413 });
  }
  if (!AVATAR_MIME_TYPES.includes(file.type as (typeof AVATAR_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "unsupported_type", allowed: AVATAR_MIME_TYPES }, { status: 415 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
    cacheControl: "3600",
  });
  if (upErr) {
    return NextResponse.json({ error: "upload_failed", message: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = pub.publicUrl;

  // Try to delete old avatar (best-effort)
  const { data: prev } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (prev?.avatar_url && prev.avatar_url.includes("/avatars/")) {
    const oldPath = prev.avatar_url.split("/avatars/")[1]?.split("?")[0];
    if (oldPath && oldPath !== path && oldPath.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }
  }

  const { error: updErr } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (updErr) {
    return NextResponse.json({ error: "profile_update_failed", message: updErr.message }, { status: 500 });
  }

  await logAudit({ userId: user.id, action: "avatar_uploaded", metadata: { path }, req });
  return NextResponse.json({ avatar_url: avatarUrl });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: prev } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (prev?.avatar_url && prev.avatar_url.includes("/avatars/")) {
    const oldPath = prev.avatar_url.split("/avatars/")[1]?.split("?")[0];
    if (oldPath && oldPath.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }
  }

  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  await logAudit({ userId: user.id, action: "avatar_deleted", req });
  return NextResponse.json({ ok: true });
}
