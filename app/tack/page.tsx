import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const revalidate = 30;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: t.listPages.gratitude.title,
    description: t.listPages.gratitude.subtitle,
  };
}

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data } = await supabase
    .from("gratitudes")
    .select("id, body, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100);

  const list = data || [];

  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <header className="mb-12 text-center">
        <div className="text-xs text-stone-500 uppercase tracking-widest mb-3">{t.listPages.gratitude.kicker}</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900 mb-4">
          {t.listPages.gratitude.title}
        </h1>
        <p className="text-stone-600 max-w-xl mx-auto leading-relaxed">
          {t.listPages.gratitude.subtitle}
        </p>
        <Link
          href="/skriv#tack"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-gold-500 text-white hover:bg-gold-700 font-medium text-sm transition-colors"
        >
          <span>✨</span> {t.listPages.gratitude.writeCta}
        </Link>
      </header>

      {list.length === 0 ? (
        <p className="text-center text-stone-500 italic">{t.listPages.gratitude.empty}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((g) => (
            <article
              key={g.id}
              className="group p-5 bg-gradient-to-br from-gold-300/10 to-parchment border border-gold-300/40 rounded-lg hover:border-gold-500/60 transition-colors"
            >
              <div className="text-xs text-gold-700 uppercase tracking-widest mb-2 font-medium">
                {formatLocaleDate(g.published_at, locale)}
              </div>
              <p className="text-stone-800 leading-relaxed font-serif">{g.body}</p>
            </article>
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <blockquote className="font-serif italic text-stone-500 max-w-lg mx-auto">
          &ldquo;{t.listPages.gratitude.quote}&rdquo;
          <footer className="not-italic text-xs uppercase tracking-wider mt-2 text-stone-400">
            {t.listPages.gratitude.quoteRef}
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
