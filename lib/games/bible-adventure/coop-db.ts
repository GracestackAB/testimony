import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/types";

export type CoopInviteStatus = "pending" | "accepted" | "declined" | "expired";
export type CoopStatus = "solo" | "active" | "ended";

export type CoopProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type CoopInviteRow = {
  id: string;
  save_id: string;
  host_id: string;
  partner_id: string;
  status: CoopInviteStatus;
  created_at: string;
  expires_at: string;
  save_title?: string;
  scenario_id?: string;
  host?: CoopProfile;
  partner?: CoopProfile;
};

export type PartnerAdventureRow = {
  id: string;
  title: string;
  scenario_id: string;
  locale: Locale;
  turn_count: number;
  updated_at: string;
  coop_status: CoopStatus;
  active_turn_user_id: string | null;
  host_id: string;
  host?: CoopProfile;
};

export async function fetchProfiles(ids: string[]): Promise<Map<string, CoopProfile>> {
  if (ids.length === 0) return new Map();
  const svc = await createServiceClient();
  const { data } = await svc
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const map = new Map<string, CoopProfile>();
  for (const p of data ?? []) {
    map.set(p.id as string, {
      id: p.id as string,
      username: p.username as string | null,
      displayName: p.display_name as string | null,
      avatarUrl: p.avatar_url as string | null,
    });
  }
  return map;
}

import {
  canUserAccessSave,
  isUsersTurn,
} from "./coop-social";

export { canUserAccessSave, isUsersTurn } from "./coop-social";

export async function listCoopInvites(userId: string): Promise<CoopInviteRow[]> {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("bible_adventure_coop_invites")
    .select("id, save_id, host_id, partner_id, status, created_at, expires_at")
    .or(`host_id.eq.${userId},partner_id.eq.${userId}`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return [];

  const saveIds = [...new Set(rows.map((r) => r.save_id as string))];
  const { data: saves } = await svc
    .from("bible_adventure_saves")
    .select("id, title, scenario_id")
    .in("id", saveIds);

  const saveMap = new Map<string, { title: string; scenario_id: string }>();
  for (const s of saves ?? []) {
    saveMap.set(s.id as string, {
      title: s.title as string,
      scenario_id: s.scenario_id as string,
    });
  }

  const profileIds = rows.flatMap((r) => [r.host_id, r.partner_id] as string[]);
  const profiles = await fetchProfiles(profileIds);

  return rows.map((r) => {
    const saveMeta = saveMap.get(r.save_id as string);
    return {
      id: r.id as string,
      save_id: r.save_id as string,
      host_id: r.host_id as string,
      partner_id: r.partner_id as string,
      status: r.status as CoopInviteStatus,
      created_at: r.created_at as string,
      expires_at: r.expires_at as string,
      save_title: saveMeta?.title,
      scenario_id: saveMeta?.scenario_id,
      host: profiles.get(r.host_id as string),
      partner: profiles.get(r.partner_id as string),
    };
  });
}

export async function listPartnerAdventures(userId: string): Promise<PartnerAdventureRow[]> {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("bible_adventure_saves")
    .select(
      "id, title, scenario_id, locale, turn_count, updated_at, coop_status, active_turn_user_id, user_id"
    )
    .eq("partner_id", userId)
    .eq("coop_status", "active")
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const hostIds = rows.map((r) => r.user_id as string);
  const profiles = await fetchProfiles(hostIds);

  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    scenario_id: r.scenario_id as string,
    locale: r.locale as Locale,
    turn_count: r.turn_count as number,
    updated_at: r.updated_at as string,
    coop_status: r.coop_status as CoopStatus,
    active_turn_user_id: r.active_turn_user_id as string | null,
    host_id: r.user_id as string,
    host: profiles.get(r.user_id as string),
  }));
}

export async function createCoopInvite(input: {
  hostId: string;
  saveId: string;
  partnerId: string;
  locale: Locale;
}): Promise<{ inviteId: string }> {
  if (input.hostId === input.partnerId) throw new Error("Cannot invite yourself");

  const svc = await createServiceClient();
  const { data: save, error: saveErr } = await svc
    .from("bible_adventure_saves")
    .select("id, user_id, partner_id, coop_status, state, title")
    .eq("id", input.saveId)
    .maybeSingle();

  if (saveErr || !save) throw new Error("Save not found");
  if (save.user_id !== input.hostId) throw new Error("Not save owner");
  if (save.coop_status === "active" || save.partner_id) throw new Error("Co-op already active");
  const state = save.state as { ended?: boolean };
  if (state?.ended) throw new Error("Adventure already ended");

  const { data: existing } = await svc
    .from("bible_adventure_coop_invites")
    .select("id, status")
    .eq("save_id", input.saveId)
    .maybeSingle();

  if (existing?.status === "pending") throw new Error("Invite already pending");

  const { data, error } = await svc
    .from("bible_adventure_coop_invites")
    .upsert(
      {
        save_id: input.saveId,
        host_id: input.hostId,
        partner_id: input.partnerId,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "save_id" }
    )
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create invite");

  await notifyCoopInvite({
    inviteId: data.id as string,
    hostId: input.hostId,
    partnerId: input.partnerId,
    saveTitle: save.title as string,
    locale: input.locale,
  });

  return { inviteId: data.id as string };
}

export async function acceptCoopInvite(input: {
  inviteId: string;
  userId: string;
}): Promise<{ saveId: string }> {
  const svc = await createServiceClient();
  const { data: invite, error } = await svc
    .from("bible_adventure_coop_invites")
    .select("*")
    .eq("id", input.inviteId)
    .maybeSingle();

  if (error || !invite) throw new Error("Invite not found");
  if (invite.partner_id !== input.userId) throw new Error("Not invited user");
  if (invite.status !== "pending") throw new Error("Invite not pending");
  if (new Date(invite.expires_at as string) < new Date()) {
    await svc
      .from("bible_adventure_coop_invites")
      .update({ status: "expired" })
      .eq("id", input.inviteId);
    throw new Error("Invite expired");
  }

  const { error: updErr } = await svc
    .from("bible_adventure_saves")
    .update({
      partner_id: input.userId,
      coop_status: "active",
      active_turn_user_id: invite.host_id,
    })
    .eq("id", invite.save_id);

  if (updErr) throw new Error(updErr.message);

  await svc
    .from("bible_adventure_coop_invites")
    .update({ status: "accepted" })
    .eq("id", input.inviteId);

  const { data: saveRow } = await svc
    .from("bible_adventure_saves")
    .select("locale")
    .eq("id", invite.save_id)
    .maybeSingle();

  await notifyCoopAccepted({
    hostId: invite.host_id as string,
    partnerId: input.userId,
    saveId: invite.save_id as string,
    locale: (saveRow?.locale as Locale) ?? "sv",
  });

  return { saveId: invite.save_id as string };
}

export async function declineCoopInvite(input: {
  inviteId: string;
  userId: string;
}): Promise<void> {
  const svc = await createServiceClient();
  const { data: invite } = await svc
    .from("bible_adventure_coop_invites")
    .select("partner_id, status")
    .eq("id", input.inviteId)
    .maybeSingle();

  if (!invite) throw new Error("Invite not found");
  if (invite.partner_id !== input.userId) throw new Error("Not invited user");
  if (invite.status !== "pending") throw new Error("Invite not pending");

  await svc
    .from("bible_adventure_coop_invites")
    .update({ status: "declined" })
    .eq("id", input.inviteId);
}

export async function leaveCoop(input: {
  saveId: string;
  userId: string;
}): Promise<void> {
  const svc = await createServiceClient();
  const { data: save } = await svc
    .from("bible_adventure_saves")
    .select("user_id, partner_id, coop_status")
    .eq("id", input.saveId)
    .maybeSingle();

  if (!save) throw new Error("Save not found");
  if (save.coop_status !== "active") throw new Error("Not in co-op");
  if (save.user_id !== input.userId && save.partner_id !== input.userId) {
    throw new Error("Not a participant");
  }

  await svc
    .from("bible_adventure_saves")
    .update({
      partner_id: null,
      coop_status: "solo",
      active_turn_user_id: null,
    })
    .eq("id", input.saveId);
}

export async function swapCoopTurn(saveId: string, currentUserId: string): Promise<void> {
  const svc = await createServiceClient();
  const { data: save } = await svc
    .from("bible_adventure_saves")
    .select("user_id, partner_id, coop_status")
    .eq("id", saveId)
    .maybeSingle();

  if (!save || save.coop_status !== "active" || !save.partner_id) return;

  const nextUser =
    currentUserId === save.user_id ? save.partner_id : (save.user_id as string);

  await svc
    .from("bible_adventure_saves")
    .update({ active_turn_user_id: nextUser })
    .eq("id", saveId);
}

async function notifyCoopInvite(input: {
  inviteId: string;
  hostId: string;
  partnerId: string;
  saveTitle: string;
  locale: Locale;
}): Promise<void> {
  const svc = await createServiceClient();
  const { data: host } = await svc
    .from("profiles")
    .select("display_name, username")
    .eq("id", input.hostId)
    .maybeSingle();

  const name = host?.display_name ?? host?.username ?? "Någon";
  const title =
    input.locale === "sv"
      ? `${name} bjuder in dig till co-op i Bibel-krönika`
      : `${name} invites you to co-op in Bible Chronicle`;
  const body =
    input.locale === "sv"
      ? `Gå med i «${input.saveTitle}» och växla turer i äventyret.`
      : `Join "${input.saveTitle}" and take turns in the adventure.`;

  await svc.from("notifications").insert({
    user_id: input.partnerId,
    type: "bible_adventure_coop",
    title,
    body,
    action_url: `/spel/bibel-aventyr?coop=${input.inviteId}`,
    actor_id: input.hostId,
    metadata: { invite_id: input.inviteId },
  });
}

async function notifyCoopAccepted(input: {
  hostId: string;
  partnerId: string;
  saveId: string;
  locale: Locale;
}): Promise<void> {
  const svc = await createServiceClient();
  const { data: partner } = await svc
    .from("profiles")
    .select("display_name, username")
    .eq("id", input.partnerId)
    .maybeSingle();

  const name = partner?.display_name ?? partner?.username ?? "Din vän";
  const title =
    input.locale === "sv"
      ? `${name} gick med i ert co-op-äventyr!`
      : `${name} joined your co-op adventure!`;
  const body =
    input.locale === "sv"
      ? "Reskamraten är redo — fortsätt äventyret tillsammans."
      : "Your companion is ready — continue the adventure together.";

  await svc.from("notifications").insert({
    user_id: input.hostId,
    type: "bible_adventure_coop",
    title,
    body,
    action_url: `/spel/bibel-aventyr?save=${input.saveId}`,
    actor_id: input.partnerId,
    metadata: { save_id: input.saveId },
  });
}

export async function resolveUsername(username: string): Promise<string | null> {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("profiles")
    .select("id")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  return (data?.id as string) ?? null;
}
