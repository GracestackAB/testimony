import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BibleEngagement } from "@/components/bible/BibleEngagement";
import { DailyBibleActions } from "@/components/bible/DailyBibleActions";
import { ParallelBiblePanel } from "@/components/bible/ParallelBiblePanel";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.dailyBible.title };
}

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("daily_bible")
    .select("*")
    .eq("status", "published")
    .lte("for_date", new Date().toISOString().slice(0, 10))
    .order("for_date", { ascending: false })
    .limit(30);
  const list = data || [];
  const today = list[0];
  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{t.dailyBible.kicker}</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">{t.dailyBible.title}</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">{t.dailyBible.subtitle}</p>
        <Link
          href="/bibel-ai"
          className="inline-block mt-4 text-sm text-olive-700 hover:text-olive-900 underline"
        >
          {t.dailyBible.askLink}
        </Link>
      </header>

      {today ? (
        <>
          <article className="mb-16">
            <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">
              {formatLocaleDate(today.for_date, locale)}
            </div>
            <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-5">{today.reference}</h2>
            <blockquote className="border-l-4 border-olive-500 pl-5 italic font-serif text-lg text-stone-700 mb-6">
              {today.text_body}
            </blockquote>
            <ParallelBiblePanel reference={today.reference} />
            <div className="prose">
              {today.explanation.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
            </div>
            <DailyBibleActions
              bibleId={today.id}
              reference={today.reference}
              textBody={today.text_body}
              explanation={today.explanation}
              isAuthed={Boolean(user)}
            />
            <BibleEngagement bibleId={today.id} />
          </article>
          {list.length > 1 && (
            <aside className="border-t border-stone-200 pt-8">
              <h3 className="font-serif text-xl font-semibold mb-4 text-stone-900">{t.dailyBible.previous}</h3>
              <ul className="space-y-3 text-sm">
                {list.slice(1).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dagens-bibeltext/${d.for_date}`}
                      className="block py-2 px-3 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      <span className="text-stone-500">{formatLocaleDate(d.for_date, locale)}</span>
                      {" · "}
                      <span className="text-stone-800">{d.reference}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </>
      ) : (
        <p className="text-center text-stone-500 italic">{t.dailyBible.empty}</p>
      )}
    </div>
  );
}
