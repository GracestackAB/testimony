import Link from "next/link";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { Avatar } from "@/components/profile/Avatar";
import { ShareButton } from "@/components/ShareButton";
import { requireCellGroupAccess, getCellGroupMembers } from "@/lib/cell-group";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/seo/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: `${slug} · ${t.cellGroups.title}` };
}

export default async function CellGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { group, service, role } = await requireCellGroupAccess(slug);
  const isLeader = role === "leader";
  const groupSlug = slug;

  async function createInvite(formData: FormData) {
    "use server";
    const inviteRole = String(formData.get("role") || "member");
    const { service, group, user } = await requireCellGroupAccess(groupSlug, { requireLeader: true });
    const token = randomBytes(12).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await service.from("cell_group_invites").insert({
      group_id: group.id,
      token,
      role: inviteRole,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    });
    redirect(`/cellgrupper/${groupSlug}#invites`);
  }

  async function deleteInvite(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const { service, group } = await requireCellGroupAccess(groupSlug, { requireLeader: true });
    await service.from("cell_group_invites").delete().eq("id", id).eq("group_id", group.id);
    redirect(`/cellgrupper/${groupSlug}#invites`);
  }

  const [members, { data: invites }] = await Promise.all([
    getCellGroupMembers(group.id),
    isLeader
      ? service
          .from("cell_group_invites")
          .select("id, token, role, uses, max_uses, expires_at, created_at")
          .eq("group_id", group.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const baseUrl = siteUrl();

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <nav className="text-sm text-stone-500 mb-4">
        <Link href="/cellgrupper" className="hover:text-stone-900">
          {t.cellGroups.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900">{group.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-2">{group.name}</h1>
        {group.description && <p className="text-stone-600 text-lg mb-2">{group.description}</p>}
        {group.meeting_info && (
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-700">
              {locale === "en" ? "Meetings:" : "Träffar:"}
            </span>{" "}
            {group.meeting_info}
          </p>
        )}
        <p className="text-sm text-stone-500 mt-2">
          {t.cellGroups.memberCount.replace("{n}", String(members.length))}
        </p>
      </header>

      <section className="mb-10 bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-serif text-xl text-stone-900">{t.cellGroups.members}</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {(members || []).map((m) => (
            <li key={m.user_id} className="px-5 py-4 flex items-center gap-3">
              <Avatar
                src={m.profiles?.avatar_url ?? null}
                name={m.profiles?.display_name ?? null}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-900 truncate">
                  {m.profiles?.display_name ?? (locale === "en" ? "Member" : "Medlem")}
                </div>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs ${
                    m.role === "leader" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {m.role === "leader" ? t.cellGroups.leader : t.cellGroups.member}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {isLeader && (
        <section id="invites" className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-serif text-xl text-stone-900">{t.cellGroups.invites}</h2>
            <p className="text-sm text-stone-600 mt-1">{t.cellGroups.invitesHint}</p>
          </div>

          <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3 flex-wrap">
            <form action={createInvite} className="flex items-center gap-2">
              <select name="role" className="p-2 border border-stone-300 rounded text-sm bg-white">
                <option value="member">{t.cellGroups.inviteRoleMember}</option>
                <option value="leader">{t.cellGroups.inviteRoleLeader}</option>
              </select>
              <button className="px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm hover:bg-olive-700">
                + {t.cellGroups.createInvite}
              </button>
            </form>
            <span className="text-xs text-stone-500">{t.cellGroups.inviteValidDays}</span>
          </div>

          {(invites || []).length === 0 ? (
            <p className="px-5 py-6 text-center text-stone-500 text-sm">{t.cellGroups.noInvites}</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {(invites || []).map((inv: {
                id: string;
                token: string;
                role: string;
                uses: number;
                expires_at: string | null;
              }) => {
                const url = `${baseUrl}/bjud-in-cell/${inv.token}`;
                const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
                return (
                  <li key={inv.id} className="px-5 py-4 flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[250px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            inv.role === "leader" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {inv.role === "leader" ? t.cellGroups.inviteRoleLeader : t.cellGroups.inviteRoleMember}
                        </span>
                        <span className="text-xs text-stone-500">
                          {inv.uses} {locale === "en" ? "used" : "använd"}
                          {inv.expires_at &&
                            ` · ${expired ? (locale === "en" ? "expired" : "utgången") : new Date(inv.expires_at).toLocaleDateString(locale === "en" ? "en-GB" : "sv-SE")}`}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-stone-600 break-all bg-stone-50 px-2 py-1.5 rounded">
                        {url}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShareButton
                        url={url}
                        title={`${t.cellGroups.welcome} — ${group.name}`}
                        text={`${t.cellGroups.welcome}: ${group.name} på testimony.se`}
                        label={t.cellGroups.shareInvite}
                        variant="secondary"
                      />
                      <form action={deleteInvite}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="text-xs text-red-700 hover:text-red-900 underline px-2">
                          {t.cellGroups.deleteInvite}
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
