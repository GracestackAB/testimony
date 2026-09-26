import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserCellGroups } from "@/lib/cell-group";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.cellGroups.title, description: t.cellGroups.subtitle };
}

export default async function CellGroupsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const groups = user ? await getUserCellGroups(user.id) : [];

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">
          {locale === "en" ? "Private groups" : "Privata grupper"}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">{t.cellGroups.title}</h1>
        <p className="mt-3 text-stone-600 max-w-2xl">{t.cellGroups.subtitle}</p>
      </header>

      {user ? (
        <div className="mb-8">
          <Link
            href="/cellgrupper/nya"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors"
          >
            + {t.cellGroups.create}
          </Link>
        </div>
      ) : (
        <div className="mb-8 p-5 rounded-xl border border-stone-200 bg-stone-50 text-stone-700">
          <p className="mb-3">{t.groups.loginForCellGroups}</p>
          <Link href="/login?next=/cellgrupper" className="text-olive-700 font-medium underline">
            {t.cellGroups.loginToAccept} →
          </Link>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-stone-500 italic">{user ? t.cellGroups.empty : t.groups.noCellGroups}</p>
      ) : (
        <ul className="space-y-4">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/cellgrupper/${g.slug}`}
                className="block p-6 rounded-xl border border-stone-200 bg-parchment hover:border-olive-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-serif text-xl font-semibold text-stone-900 mb-1">{g.name}</div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        g.role === "leader" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {g.role === "leader" ? t.cellGroups.leader : t.cellGroups.member}
                    </span>
                  </div>
                  <span className="text-olive-700 shrink-0">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 text-center">
        <Link href="/grupper" className="text-sm text-stone-600 hover:text-olive-700">
          {t.groups.allMinistries} →
        </Link>
      </div>
    </div>
  );
}
