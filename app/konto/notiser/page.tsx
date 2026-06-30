import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPreferences } from "@/lib/notifications/server";
import { NotificationSettings } from "./NotificationSettings";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/konto/notiser");

  const prefs = (await getMyPreferences()) ?? ({} as Record<string, never>);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .maybeSingle();
  const isModerator = Boolean(profile?.is_moderator);

  return (
    <NotificationSettings
      initialPrefs={prefs}
      vapidPublicKey={vapidKey}
      isModerator={isModerator}
    />
  );
}
