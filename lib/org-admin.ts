import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type UserOrg = {
  id: string;
  slug: string;
  name: string;
  role: string;
};

/** Hämtar alla verksamheter user är medlem/admin i */
export async function getUserOrgs(userId: string): Promise<UserOrg[]> {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("memberships")
    .select("role, organizations(id, slug, name)")
    .eq("user_id", userId);
  if (!data) return [];
  return data
    .map((m: any) => m.organizations && {
      id: m.organizations.id,
      slug: m.organizations.slug,
      name: m.organizations.name,
      role: m.role,
    })
    .filter(Boolean) as UserOrg[];
}

/** Kräver att user är admin/moderator för denna verksamhet (by slug). Returnerar org + user. */
export async function requireOrgAccess(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/min-verksamhet/${slug}`);

  const svc = await createServiceClient();
  const { data: org } = await svc
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!org) redirect("/min-verksamhet");

  // Super-moderator får alltid access
  const { data: profile } = await svc.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle();
  if (profile?.is_moderator) {
    return { user, org, service: svc, role: "moderator" };
  }

  // Annars: kolla membership
  const { data: mem } = await svc
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!mem) redirect("/?error=not-org-admin");

  return { user, org, service: svc, role: mem.role };
}
