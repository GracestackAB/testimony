import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function requireModerator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const h = await headers();
    const pathname = h.get("x-pathname") || "/admin";
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_moderator, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_moderator) {
    redirect("/?error=not-authorized");
  }

  const service = await createServiceClient();
  return { user, profile, supabase, service };
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
