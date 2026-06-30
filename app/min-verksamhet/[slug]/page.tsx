import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgAccess } from "@/lib/org-admin";
import { ShareButton } from "@/components/ShareButton";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Hantera ${slug}` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { org, service } = await requireOrgAccess(slug);

  const orgSlug = slug;

  async function createInvite(formData: FormData) {
    "use server";
    const role = String(formData.get("role") || "member");
    const { service, org, user } = await requireOrgAccess(orgSlug);
    const token = randomBytes(12).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await service.from("organization_invites").insert({
      organization_id: org.id,
      token,
      role,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    });
    redirect(`/min-verksamhet/${orgSlug}#invites`);
  }

  async function deleteInvite(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const { service, org } = await requireOrgAccess(orgSlug);
    await service.from("organization_invites").delete().eq("id", id).eq("organization_id", org.id);
    redirect(`/min-verksamhet/${orgSlug}#invites`);
  }

  const [{ data: vols }, { data: appsRaw }, { data: invites }] = await Promise.all([
    service
      .from("volunteer_opportunities")
      .select("id, slug, title, status, category, commitment")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    service
      .from("volunteer_applications")
      .select("id, status, message, created_at, volunteer_opportunities!inner(id, title, organization_id)")
      .eq("volunteer_opportunities.organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20),
    service
      .from("organization_invites")
      .select("id, token, role, uses, max_uses, expires_at, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
  ]);

  const openVols = (vols || []).filter((v: any) => v.status === "open").length;
  const pendingApps = (appsRaw || []).filter((a: any) => a.status === "pending").length;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <nav className="text-sm text-stone-500 mb-4">
        <Link href="/min-verksamhet" className="hover:text-stone-900">Mina verksamheter</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900">{org.name}</span>
      </nav>

      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-1">{org.name}</h1>
          <p className="text-stone-600">
            {org.type} {org.city && `· ${org.city}`} ·{" "}
            <span className={org.is_published ? "text-olive-700" : "text-amber-700"}>
              {org.is_published ? "publicerad" : "utkast"}
            </span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/plats/${org.slug}`}
            className="px-4 py-2 rounded-full border border-stone-300 text-sm hover:bg-stone-50"
          >
            Visa publik sida
          </Link>
          <Link
            href={`/min-verksamhet/${org.slug}/redigera`}
            className="px-4 py-2 rounded-full bg-stone-900 text-parchment text-sm hover:bg-stone-800"
          >
            Redigera info
          </Link>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <Stat label="Volontäruppgifter" value={vols?.length ?? 0} sub={`${openVols} öppna`} />
        <Stat label="Ansökningar" value={appsRaw?.length ?? 0} sub={`${pendingApps} obesvarade`} />
        <Stat label="Publik status" value={org.is_published ? "Live" : "Utkast"} sub={org.is_published ? "Syns på sajten" : "Dold"} />
      </div>

      <section className="mb-10 bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-serif text-xl text-stone-900">Volontäruppgifter</h2>
          <Link
            href={`/min-verksamhet/${org.slug}/volontar/ny`}
            className="px-3 py-1.5 rounded-full bg-olive-600 text-parchment text-sm hover:bg-olive-700"
          >
            + Ny uppgift
          </Link>
        </div>
        {(vols || []).length === 0 ? (
          <p className="px-5 py-8 text-center text-stone-500 text-sm">
            Inga volontäruppgifter ännu. Lägg till en så att människor kan anmäla sig.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Titel</th>
                <th className="text-left px-5 py-3">Kategori</th>
                <th className="text-left px-5 py-3">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(vols || []).map((v: any) => (
                <tr key={v.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-5 py-3 font-medium text-stone-900">{v.title}</td>
                  <td className="px-5 py-3 text-stone-600">{v.category} · {v.commitment}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      v.status === "open" ? "bg-olive-100 text-olive-900" : "bg-stone-100 text-stone-700"
                    }`}>{v.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/min-verksamhet/${org.slug}/volontar/${v.id}`} className="text-olive-700 underline">
                      Redigera
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="invites" className="mb-10 bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-serif text-xl text-stone-900">Inbjudningslänkar</h2>
          <p className="text-sm text-stone-600 mt-1">
            Skapa en länk att dela i gruppchatt, mail eller SMS. Den som klickar blir automatiskt medlem.
          </p>
        </div>

        <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3 flex-wrap">
          <form action={createInvite} className="flex items-center gap-2">
            <select name="role" className="p-2 border border-stone-300 rounded text-sm bg-white">
              <option value="member">Medlem (följer)</option>
              <option value="admin">Admin (kan redigera)</option>
            </select>
            <button className="px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm hover:bg-olive-700">
              + Skapa inbjudningslänk
            </button>
          </form>
          <span className="text-xs text-stone-500">Giltig i 30 dagar</span>
        </div>

        {(invites || []).length === 0 ? (
          <p className="px-5 py-6 text-center text-stone-500 text-sm">Inga aktiva inbjudningar ännu.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {(invites || []).map((inv: any) => {
              const url = `https://testimony.se/bjud-in/${inv.token}`;
              const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
              return (
                <li key={inv.id} className="px-5 py-4 flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        inv.role === "admin" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-700"
                      }`}>
                        {inv.role === "admin" ? "Admin-roll" : "Medlem-roll"}
                      </span>
                      <span className="text-xs text-stone-500">
                        {inv.uses} använd{inv.uses === 1 ? "" : "a"}
                        {inv.expires_at && ` · ${expired ? "utgången" : "giltig till " + new Date(inv.expires_at).toLocaleDateString("sv-SE")}`}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-stone-600 break-all bg-stone-50 px-2 py-1.5 rounded">
                      {url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShareButton
                      url={url}
                      title={`Välkommen till ${org.name}`}
                      text={`Du är inbjuden att vara med på testimony.se — ${org.name}.`}
                      label="Dela"
                      variant="secondary"
                    />
                    <form action={deleteInvite}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button className="text-xs text-red-700 hover:text-red-900 underline px-2">
                        Ta bort
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-serif text-xl text-stone-900">Senaste ansökningar</h2>
        </div>
        {(appsRaw || []).length === 0 ? (
          <p className="px-5 py-8 text-center text-stone-500 text-sm">Inga ansökningar ännu.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {(appsRaw || []).map((a: any) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="font-medium text-stone-900">{a.volunteer_opportunities?.title}</div>
                  <span className="text-xs text-stone-500">{new Date(a.created_at).toLocaleDateString("sv-SE")}</span>
                </div>
                {a.message && <p className="text-sm text-stone-700 mb-1">{a.message}</p>}
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                  a.status === "pending" ? "bg-amber-100 text-amber-900" :
                  a.status === "accepted" ? "bg-olive-100 text-olive-900" :
                  "bg-stone-100 text-stone-700"
                }`}>{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">{label}</div>
      <div className="font-serif text-3xl font-semibold text-stone-900">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    </div>
  );
}
