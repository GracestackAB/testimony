import "server-only";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile, PublicProfile, Contributions, UsernameAvailability } from "./types";
import { DEFAULT_FIELD_VISIBILITY } from "./constants";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("getMyProfile error:", error.message);
    return null;
  }
  if (!data) {
    const service = await createServiceClient();
    const displayName =
      (user.user_metadata?.display_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Användare";
    const { data: created, error: insertErr } = await service
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName }, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    if (insertErr || !created) {
      console.error("getMyProfile create error:", insertErr?.message);
      return null;
    }
    return normalizeProfile(created);
  }
  return normalizeProfile(data);
}

export async function getPublicProfileByUsername(username: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as PublicProfile;
}

export async function getPublicProfileById(id: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as PublicProfile;
}

export async function getMyContributions(userId: string): Promise<Contributions> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("profile_my_contributions", { p_user_id: userId });
  if (error || !data) {
    return { testimonies: [], prayer_requests: [], prayer_answers: [], gratitudes: [] };
  }
  return data as Contributions;
}

export async function getPublicContributionsByAuthor(userId: string) {
  const supabase = await createClient();
  const [testimonies, prayer_requests, prayer_answers, gratitudes] = await Promise.all([
    supabase
      .from("testimonies")
      .select("id, slug, title, lede, published_at, format")
      .eq("author_id", userId)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("published_at", { ascending: false })
      .limit(50),
    supabase
      .from("prayer_requests")
      .select("id, title, body, is_answered, created_at")
      .eq("author_id", userId)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("prayer_answers")
      .select("id, body, published_at")
      .eq("author_id", userId)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("published_at", { ascending: false })
      .limit(50),
    supabase
      .from("gratitudes")
      .select("id, body, published_at")
      .eq("author_id", userId)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("published_at", { ascending: false })
      .limit(50),
  ]);
  return {
    testimonies: testimonies.data ?? [],
    prayer_requests: prayer_requests.data ?? [],
    prayer_answers: prayer_answers.data ?? [],
    gratitudes: gratitudes.data ?? [],
  };
}

export async function checkUsername(username: string, selfId?: string): Promise<UsernameAvailability> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("username_check", {
    p_username: username,
    p_self: selfId ?? null,
  });
  if (error) return { available: false, reason: "invalid_format" };
  return data as UsernameAvailability;
}

export async function touchLastActive(userId: string) {
  const supabase = await createServiceClient();
  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
}

function normalizeProfile(row: Record<string, unknown>): Profile {
  const visibility = (row.field_visibility as Record<string, string> | null) ?? DEFAULT_FIELD_VISIBILITY;
  return {
    id: row.id as string,
    username: (row.username as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    church: (row.church as string | null) ?? null,
    church_id: (row.church_id as string | null) ?? null,
    denomination: (row.denomination as Profile["denomination"]) ?? null,
    role_in_church: (row.role_in_church as Profile["role_in_church"]) ?? null,
    believer_since: (row.believer_since as string | null) ?? null,
    favorite_verse: (row.favorite_verse as string | null) ?? null,
    headline: (row.headline as string | null) ?? null,
    ministry_focus: (row.ministry_focus as string | null) ?? null,
    open_to_connect: Boolean(row.open_to_connect),
    open_to_serve: Boolean(row.open_to_serve),
    preferred_locale: (row.preferred_locale === "en" ? "en" : "sv") as Profile["preferred_locale"],
    is_moderator: Boolean(row.is_moderator),
    is_org_admin: Boolean(row.is_org_admin),
    profile_visibility: (row.profile_visibility as Profile["profile_visibility"]) ?? "public",
    field_visibility: visibility as Profile["field_visibility"],
    consent_special_category_at: (row.consent_special_category_at as string | null) ?? null,
    consent_special_category_version: (row.consent_special_category_version as string | null) ?? null,
    onboarding_completed: Boolean(row.onboarding_completed),
    username_changed_at: (row.username_changed_at as string | null) ?? null,
    last_active_at: (row.last_active_at as string | null) ?? null,
    deleted_at: (row.deleted_at as string | null) ?? null,
    is_anonymized: Boolean(row.is_anonymized),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
