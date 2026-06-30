import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile, getMyContributions } from "@/lib/profile/server";
import { Avatar } from "@/components/profile/Avatar";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Utkast",
  pending: "Granskas",
  published: "Publicerat",
  rejected: "Avvisat",
  archived: "Arkiverat",
};

export default async function KontoPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/konto");

  if (!profile.onboarding_completed) {
    redirect("/konto/valkommen");
  }

  const contributions = await getMyContributions(profile.id);

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      {/* Header */}
      <div className="flex items-start gap-5 mb-10">
        <Avatar src={profile.avatar_url} name={profile.display_name} size={96} />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">
            {profile.display_name ?? "Mitt konto"}
          </h1>
          {profile.username && (
            <Link href={`/u/${profile.username}`} className="text-olive-700 hover:underline text-sm">
              testimony.se/u/{profile.username}
            </Link>
          )}
          {profile.bio && <p className="text-stone-700 text-sm mt-2">{profile.bio}</p>}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        <Link href="/min-andakt" className="px-3 py-3 rounded border border-olive-300 bg-olive-50 hover:bg-olive-100 text-sm text-stone-800 text-center col-span-2 sm:col-span-3">
          🕊️ Min andakt — privat journal
        </Link>
        <Link href="/konto/redigera" className="px-3 py-3 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm text-stone-800 text-center">
          Redigera profil
        </Link>
        <Link href="/konto/notiser" className="px-3 py-3 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm text-stone-800 text-center">
          Notiser
        </Link>
        <Link href="/konto/integritet" className="px-3 py-3 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm text-stone-800 text-center">
          Synlighet & samtycke
        </Link>
        <Link href="/konto/exportera" className="px-3 py-3 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm text-stone-800 text-center">
          Ladda ner mina data
        </Link>
        <Link href="/konto/radera" className="px-3 py-3 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm text-stone-800 text-center">
          Radera konto
        </Link>
      </div>

      {/* Contributions */}
      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">Mina vittnesbörd</h2>
        {contributions.testimonies.length === 0 ? (
          <p className="text-stone-500 text-sm">
            Du har inte delat något vittnesbörd än.{" "}
            <Link href="/skriv" className="text-olive-700 underline">Skriv ditt första</Link>.
          </p>
        ) : (
          <ul className="space-y-2">
            {contributions.testimonies.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-3 border border-stone-200 rounded bg-parchment">
                <div className="min-w-0">
                  <Link href={`/vittnesbord/${t.slug}`} className="font-medium text-stone-900 hover:underline truncate block">
                    {t.title}
                  </Link>
                  <span className="text-xs text-stone-500">
                    {STATUS_LABEL[t.status] ?? t.status} · {new Date(t.created_at).toLocaleDateString("sv-SE")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">Mina böneämnen</h2>
        {contributions.prayer_requests.length === 0 ? (
          <p className="text-stone-500 text-sm">Inga böneämnen ännu.</p>
        ) : (
          <ul className="space-y-2">
            {contributions.prayer_requests.map((p) => (
              <li key={p.id} className="p-3 border border-stone-200 rounded bg-parchment">
                <div className="font-medium text-stone-900">{p.title ?? "Böneämne"}</div>
                <span className="text-xs text-stone-500">
                  {STATUS_LABEL[p.status] ?? p.status}
                  {p.is_answered ? " · Bönesvar" : ""} ·{" "}
                  {new Date(p.created_at).toLocaleDateString("sv-SE")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">Mina bönesvar & tack</h2>
        {contributions.prayer_answers.length === 0 && contributions.gratitudes.length === 0 ? (
          <p className="text-stone-500 text-sm">Inget delat ännu.</p>
        ) : (
          <ul className="space-y-2">
            {contributions.prayer_answers.map((p) => (
              <li key={p.id} className="p-3 border border-stone-200 rounded bg-parchment text-sm">
                <span className="text-olive-700 font-medium">Bönesvar</span> ·{" "}
                {STATUS_LABEL[p.status] ?? p.status} ·{" "}
                {new Date(p.created_at).toLocaleDateString("sv-SE")}
              </li>
            ))}
            {contributions.gratitudes.map((g) => (
              <li key={g.id} className="p-3 border border-stone-200 rounded bg-parchment text-sm">
                <span className="text-gold-700 font-medium">Tack</span> ·{" "}
                {STATUS_LABEL[g.status] ?? g.status} ·{" "}
                {new Date(g.created_at).toLocaleDateString("sv-SE")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
