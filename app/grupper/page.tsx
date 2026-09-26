import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserCellGroups } from "@/lib/cell-group";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const revalidate = 120;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.groups.title, description: t.groups.subtitle };
}

export default async function GroupsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, cellGroups] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, slug, name, type, city, description")
      .eq("is_published", true)
      .order("name"),
    user ? getUserCellGroups(user.id) : Promise.resolve([]),
  ]);

  const orgs = data ?? [];

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">
          {locale === "en" ? "Like Facebook Groups" : "Som Facebook-grupper"}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">{t.groups.title}</h1>
        <p className="mt-3 text-stone-600 max-w-2xl mx-auto">{t.groups.subtitle}</p>
      </header>

      <section className="mb-12 p-6 rounded-xl border border-olive-200 bg-olive-50/50">
        <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">{t.groups.cellGroupsTitle}</h2>
        <p className="text-stone-600 mb-4 text-sm">{t.groups.cellGroupsSubtitle}</p>
        {user ? (
          <div className="flex flex-wrap gap-3 items-center">
            <Link
              href="/cellgrupper"
              className="px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm hover:bg-olive-700 font-medium"
            >
              {t.groups.myCellGroups}
            </Link>
            <Link
              href="/cellgrupper/nya"
              className="px-4 py-2 rounded-full border border-olive-600 text-olive-800 text-sm hover:bg-olive-100 font-medium"
            >
              + {t.groups.createCellGroup}
            </Link>
            {cellGroups.length > 0 && (
              <span className="text-sm text-stone-500">
                {cellGroups.length} {locale === "en" ? "group(s)" : "grupp(er)"}
              </span>
            )}
          </div>
        ) : (
          <Link href="/login?next=/cellgrupper" className="text-olive-700 font-medium underline text-sm">
            {t.groups.loginForCellGroups}
          </Link>
        )}
      </section>

      {orgs.length === 0 ? (
        <p className="text-center text-stone-500 italic">{t.groups.empty}</p>
      ) : (
        <ul className="grid md:grid-cols-2 gap-5">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/plats/${o.slug}`}
                className="block h-full p-6 rounded-xl border border-stone-200 bg-parchment hover:border-olive-500 transition-colors"
              >
                <div className="font-serif text-xl font-semibold text-stone-900 mb-1">{o.name}</div>
                {o.city && <div className="text-sm text-stone-500 mb-2">{o.city}</div>}
                {o.description && (
                  <p className="text-sm text-stone-700 line-clamp-3 leading-relaxed">{o.description}</p>
                )}
                <span className="inline-block mt-4 text-sm text-olive-700 font-medium">
                  {t.groups.viewMinistry} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 text-center">
        <Link href="/plats" className="text-sm text-stone-600 hover:text-olive-700">
          {t.groups.allMinistries} →
        </Link>
      </div>
    </div>
  );
}
