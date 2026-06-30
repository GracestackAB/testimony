import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const revalidate = 30;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.listPages.prayerAnswers.title };
}

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data } = await supabase
    .from("prayer_answers")
    .select("id, body, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(80);
  const list = data || [];
  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{t.listPages.prayerAnswers.kicker}</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">{t.listPages.prayerAnswers.title}</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">{t.listPages.prayerAnswers.subtitle}</p>
      </header>
      {list.length === 0 ? (
        <p className="text-center text-stone-500 italic">{t.listPages.prayerAnswers.empty}</p>
      ) : (
        <ul className="space-y-8">
          {list.map((a) => (
            <li key={a.id} className="border-l-4 border-gold-500 pl-5">
              <time className="block text-xs text-stone-500 mb-2 uppercase tracking-wider">
                {a.published_at ? formatLocaleDate(a.published_at, locale) : ""}
              </time>
              <p className="text-stone-800 font-serif text-lg leading-relaxed">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
