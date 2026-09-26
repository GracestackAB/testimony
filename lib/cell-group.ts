import { redirect } from "next/navigation";
import { slugify } from "@/lib/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export type UserCellGroup = {
  id: string;
  slug: string;
  name: string;
  role: string;
  memberCount?: number;
};

export type CellGroup = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  meeting_info: string | null;
  created_by: string;
  created_at: string;
};

/** Slug för ny cellgrupp — unik suffix för att undvika kollisioner. */
export function cellGroupSlugFromName(name: string): string {
  const base = slugify(name) || "cellgrupp";
  return `${base}-${randomBytes(3).toString("base64url")}`;
}

/** Hämtar alla cellgrupper användaren tillhör. */
export async function getUserCellGroups(userId: string): Promise<UserCellGroup[]> {
  const svc = await createServiceClient();
  const { data: memberships, error: memErr } = await svc
    .from("cell_group_members")
    .select("role, group_id")
    .eq("user_id", userId);

  if (memErr || !memberships?.length) return [];

  const groupIds = [...new Set(memberships.map((m: { group_id: string }) => m.group_id))];
  const { data: groups, error: groupErr } = await svc
    .from("cell_groups")
    .select("id, slug, name")
    .in("id", groupIds);

  if (groupErr || !groups?.length) return [];

  const groupById = new Map(
    (groups as { id: string; slug: string; name: string }[]).map((g) => [g.id, g])
  );

  return memberships
    .map((m: { role: string; group_id: string }) => {
      const g = groupById.get(m.group_id);
      return g ? { id: g.id, slug: g.slug, name: g.name, role: m.role } : null;
    })
    .filter(Boolean) as UserCellGroup[];
}

/** Kräver medlemskap i cellgruppen. `requireLeader` begränsar till ledare. */
export async function requireCellGroupAccess(slug: string, opts?: { requireLeader?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/cellgrupper/${slug}`);

  const svc = await createServiceClient();
  const { data: group } = await svc.from("cell_groups").select("*").eq("slug", slug).maybeSingle();

  if (!group) redirect("/cellgrupper");

  const { data: mem } = await svc
    .from("cell_group_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("group_id", group.id)
    .maybeSingle();

  if (!mem) redirect("/cellgrupper?error=not-member");

  if (opts?.requireLeader && mem.role !== "leader") {
    redirect(`/cellgrupper/${slug}?error=not-leader`);
  }

  return { user, group: group as CellGroup, service: svc, role: mem.role as string };
}

/** Medlemmar i en grupp med profilinfo (utan PostgREST-join). */
export type CellGroupMemberView = {
  role: string;
  created_at: string;
  user_id: string;
  profiles: { id: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function getCellGroupMembers(groupId: string): Promise<CellGroupMemberView[]> {
  const svc = await createServiceClient();
  const { data: memberships } = await svc
    .from("cell_group_members")
    .select("role, created_at, user_id")
    .eq("group_id", groupId)
    .order("created_at");

  if (!memberships?.length) return [];

  const userIds = memberships.map((m: { user_id: string }) => m.user_id);
  const { data: profiles } = await svc
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileById = new Map(
    (profiles as { id: string; display_name: string | null; avatar_url: string | null }[] | null)?.map(
      (p) => [p.id, p]
    ) ?? []
  );

  return memberships.map((m: { role: string; created_at: string; user_id: string }) => ({
    role: m.role,
    created_at: m.created_at,
    user_id: m.user_id,
    profiles: profileById.get(m.user_id) ?? null,
  })) as CellGroupMemberView[];
}

type CellGroupInviteRow = {
  id: string;
  group_id: string;
  token: string;
  role: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
};

/** Hämtar inbjudan + grupp utan PostgREST-join. */
export async function getCellGroupInviteByToken(token: string) {
  const svc = await createServiceClient();
  const { data: inv } = await svc
    .from("cell_group_invites")
    .select("id, group_id, token, role, expires_at, max_uses, uses")
    .eq("token", token)
    .maybeSingle();

  if (!inv) return null;

  const { data: group } = await svc
    .from("cell_groups")
    .select("id, slug, name, description, meeting_info")
    .eq("id", (inv as CellGroupInviteRow).group_id)
    .maybeSingle();

  if (!group) return null;

  return { invite: inv as CellGroupInviteRow, group };
}
