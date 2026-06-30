import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Notification, NotificationPreference, NotificationType } from "./types";

export async function getMyNotifications(limit = 30): Promise<Notification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .schema("testimony")
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function getMyUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .schema("testimony")
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}

export async function getMyPreferences(): Promise<Record<NotificationType, NotificationPreference> | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .schema("testimony")
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id);
  const map: Partial<Record<NotificationType, NotificationPreference>> = {};
  for (const row of (data ?? []) as NotificationPreference[]) {
    map[row.type] = row;
  }
  return map as Record<NotificationType, NotificationPreference>;
}
