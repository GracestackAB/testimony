import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedCard } from "@/components/FeedCard";
import { DailyBibleHighlight } from "@/components/bible/DailyBibleHighlight";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const revalidate = 60;

function truncate(s: string | null, n = 200) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [testRes, ansRes, reqRes, gratRes] = await Promise.all([
    supabase
      .from("testimonies")
      .select("id, slug, title, lede, format, cover_image_url, published_at, chain_size")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4),
    supabase
      .from("prayer_answers")
      .select("id, body, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4),
    supabase
      .from("prayer_requests")
      .select("id, title, body, is_answered, created_at")
      .eq("status", "published")
      .eq("is_answered", false)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("gratitudes")
      .select("id, body, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4),
  ]);

  const testimonies = testRes.data || [];
  const answers = ansRes.data || [];
  const requests = reqRes.data || [];
  const gratitudes = gratRes.data || [];

  return (
    <div>
      <div className="bg-olive-600 text-parchment text-center text-sm py-2 px-4">
        {t.home.globalBanner}
      </div>

      <section className="border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-5 pt-16 pb-14 text-center">
          <div className="text-stone-500 uppercase tracking-widest text-xs mb-5 font-medium">
            {t.home.tagline}
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-semibold text-stone-900 leading-tight mb-6">
            {t.home.heroTitle}
            <em className="text-olive-700 not-italic">{t.home.heroTitleEm}</em>
            {locale === "en" ? " takes shape." : " tar form."}
          </h1>
          <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            {t.home.heroSubtitle}
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link href="/vittnesbord" className="px-6 py-3 rounded-full bg-stone-900 text-parchment hover:bg-stone-800">
              {t.home.ctaRead}
            </Link>
            <Link href="/skriv" className="px-6 py-3 rounded-full border border-stone-300 text-stone-800 hover:border-olive-500 hover:text-olive-700">
              {t.home.ctaShare}
            </Link>
            {user && (
              <Link href="/flode" className="px-6 py-3 rounded-full border border-olive-400 text-olive-700 bg-olive-50 hover:bg-olive-100">
                {t.home.myFeedCta}
              </Link>
            )}
          </div>
          <blockquote className="mt-12 font-serif italic text-stone-500 max-w-xl mx-auto">
            &ldquo;{t.home.quote}&rdquo;
            <footer className="not-italic text-xs uppercase tracking-wider mt-2 text-stone-400">
              {t.home.quoteRef}
            </footer>
          </blockquote>
        </div>
      </section>

      <DailyBibleHighlight />

      <section className="border-b border-stone-200 bg-stone-50">
        <div className="max-w-5xl mx-auto px-5 py-12 grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-parchment border border-stone-200">
            <div className="text-xs uppercase tracking-widest text-olive-600 font-medium mb-2">
              {locale === "en" ? "Like Facebook" : "Som Facebook"}
            </div>
            <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-3">{t.home.socialTitle}</h2>
            <p className="text-stone-600 text-sm leading-relaxed mb-5">{t.home.socialDesc}</p>
            <Link href="/vittnesbord" className="text-sm font-medium text-olive-700 hover:underline">
              {t.home.socialCta} →
            </Link>
          </div>
          <div className="p-8 rounded-2xl bg-parchment border border-stone-200">
            <div className="text-xs uppercase tracking-widest text-gold-700 font-medium mb-2">
              {locale === "en" ? "Like LinkedIn" : "Som LinkedIn"}
            </div>
            <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-3">{t.home.ministryTitle}</h2>
            <p className="text-stone-600 text-sm leading-relaxed mb-5">{t.home.ministryDesc}</p>
            <Link href="/sok" className="text-sm font-medium text-olive-700 hover:underline">
              {t.home.ministryCta} →
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 py-14 grid lg:grid-cols-3 gap-14">
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-serif text-2xl font-semibold text-stone-900">{t.home.latest}</h2>
            <Link href="/vittnesbord" className="text-sm text-stone-600 hover:text-olive-700">
              {t.home.allTestimonies}
            </Link>
          </div>
          {testimonies.length === 0 && (
            <p className="text-stone-500 italic">{t.home.noTestimonies}</p>
          )}
          {testimonies.map((item) => (
            <FeedCard
              key={item.id}
              kind="testimony"
              title={item.title}
              body={truncate(item.lede, 220)}
              href={`/vittnesbord/${item.slug}`}
              meta={formatLocaleDate(item.published_at, locale)}
              format={item.format}
              coverImage={item.cover_image_url}
              chainSize={item.chain_size}
              kindLabels={t.feedKinds}
              chainBadge={t.feedKinds.chainBadge}
            />
          ))}
        </div>

        <aside className="space-y-10">
          <div>
            <h3 className="font-serif text-xl font-semibold text-stone-900 mb-4">{t.home.prayerAnswers}</h3>
            {answers.length === 0 && <p className="text-sm text-stone-500 italic">{t.home.noPrayerAnswers}</p>}
            <ul className="space-y-5">
              {answers.map((a) => (
                <li key={a.id} className="text-sm border-l-2 border-gold-500 pl-4">
                  <div className="text-xs text-stone-500 mb-1">{formatLocaleDate(a.published_at, locale)}</div>
                  <p className="text-stone-700">{truncate(a.body, 160)}</p>
                </li>
              ))}
            </ul>
            <Link href="/bonesvar" className="text-xs text-stone-600 hover:text-olive-700 mt-4 inline-block">
              {t.home.allPrayerAnswers}
            </Link>
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-stone-900 mb-4">{t.home.prayerNow}</h3>
            {requests.length === 0 && <p className="text-sm text-stone-500 italic">{t.home.noPrayerRequests}</p>}
            <ul className="space-y-5">
              {requests.map((r) => (
                <li key={r.id} className="text-sm border-l-2 border-olive-500 pl-4">
                  {r.title && <div className="font-medium text-stone-800 mb-0.5">{r.title}</div>}
                  <p className="text-stone-600">{truncate(r.body, 140)}</p>
                </li>
              ))}
            </ul>
            <Link href="/boneamnen" className="text-xs text-stone-600 hover:text-olive-700 mt-4 inline-block">
              {t.home.allPrayerRequests}
            </Link>
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-stone-900 mb-4">{t.home.gratitude}</h3>
            {gratitudes.length === 0 && <p className="text-sm text-stone-500 italic">{t.home.noGratitude}</p>}
            <ul className="space-y-4">
              {gratitudes.map((g) => (
                <li key={g.id} className="text-sm p-3 bg-gradient-to-br from-gold-300/10 to-parchment border border-gold-300/40 rounded-lg">
                  <div className="text-xs text-gold-700 mb-1 font-medium">{formatLocaleDate(g.published_at, locale)}</div>
                  <p className="text-stone-700 font-serif italic">&ldquo;{truncate(g.body, 140)}&rdquo;</p>
                </li>
              ))}
            </ul>
            <Link href="/tack" className="text-xs text-stone-600 hover:text-olive-700 mt-4 inline-block">
              {t.home.allGratitude}
            </Link>
          </div>
        </aside>
      </section>

      <section className="border-t border-stone-200 bg-stone-50">
        <div className="max-w-5xl mx-auto px-5 py-16 grid md:grid-cols-4 gap-8">
          {[
            { ...t.home.pillars.community, href: "/vittnesbord" },
            { ...t.home.pillars.network, href: "/sok" },
            { ...t.home.pillars.volunteer, href: "/volontar" },
            { ...t.home.pillars.bible, href: "/bibel-ai" },
          ].map((p) => (
            <Link key={p.title} href={p.href} className="group">
              <div className="font-serif text-xl font-semibold text-stone-900 mb-2 group-hover:text-olive-700">
                {p.title}
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">{p.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
