import Link from "next/link";
import { getTodayDailyBible } from "@/lib/bible/today";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export async function DailyBibleHighlight() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const today = await getTodayDailyBible();

  if (!today) return null;

  const askQuestion =
    locale === "en"
      ? `What does ${today.reference} mean?`
      : `Vad betyder ${today.reference}?`;

  return (
    <section className="border-b border-stone-200 bg-gradient-to-b from-olive-50/80 to-parchment">
      <div className="max-w-4xl mx-auto px-5 py-12">
        <div className="rounded-2xl border border-olive-200/80 bg-parchment shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-olive-700 text-parchment flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">{t.home.todayBibleKicker}</div>
              <h2 className="font-serif text-xl font-semibold">{t.home.todayBibleTitle}</h2>
            </div>
            <time className="text-xs opacity-80">{formatLocaleDate(today.for_date, locale)}</time>
          </div>

          <div className="px-6 py-6">
            <h3 className="font-serif text-2xl font-semibold text-stone-900 mb-3">{today.reference}</h3>
            <blockquote className="border-l-4 border-olive-400 pl-4 font-serif italic text-lg text-stone-700 leading-relaxed">
              {truncate(today.text_body, 280)}
            </blockquote>
            {today.explanation && (
              <p className="mt-4 text-sm text-stone-600 leading-relaxed">
                {truncate(today.explanation.split("\n\n")[0] ?? "", 200)}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dagens-bibeltext"
                className="px-5 py-2.5 rounded-full bg-stone-900 text-parchment text-sm font-medium hover:bg-stone-800"
              >
                {t.home.todayBibleRead}
              </Link>
              <Link
                href={`/bibel-ai?q=${encodeURIComponent(askQuestion)}`}
                className="px-5 py-2.5 rounded-full border border-olive-500 text-olive-800 text-sm font-medium hover:bg-olive-50"
              >
                {t.home.todayBibleAsk}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
