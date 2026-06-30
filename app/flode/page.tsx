import Link from "next/link";
import { FeedCard } from "@/components/FeedCard";
import { WeeklyDigestCard } from "@/components/feed/WeeklyDigestCard";
import { createClient } from "@/lib/supabase/server";
import { getNetworkFeed } from "@/lib/feed/network-feed";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.feed.title, description: t.feed.subtitle };
}

export default async function MyFeedPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-3">{t.feed.title}</h1>
        <p className="text-stone-600 mb-6">{t.feed.loginRequired}</p>
        <Link href="/login?next=/flode" className="px-6 py-3 rounded-full bg-stone-900 text-parchment hover:bg-stone-800">
          {t.feed.loginBtn}
        </Link>
      </div>
    );
  }

  const { items, followingCount } = await getNetworkFeed(user.id);

  const kindLabels = {
    testimony: t.nav.testimonies,
    prayer_request: t.nav.prayerRequests,
    prayer_answer: t.nav.prayerAnswers,
    gratitude: t.nav.gratitude,
    bible: t.nav.dailyBible,
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10">
        <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-2">{t.feed.title}</h1>
        <p className="text-stone-600">{t.feed.subtitle}</p>
        {followingCount > 0 && (
          <p className="text-xs text-stone-500 mt-2">
            {followingCount} {locale === "en" ? "people" : "personer"}
          </p>
        )}
      </header>

      <WeeklyDigestCard
        locale={locale}
        followingCount={followingCount}
        labels={{
          title: t.feed.weeklyTitle,
          subtitle: t.feed.weeklySubtitle,
          loading: t.feed.weeklyLoading,
          refresh: t.feed.weeklyRefresh,
          emptyNetwork: t.feed.empty,
          prayer: t.feed.weeklyPrayer,
          itemCount: t.feed.weeklyItemCount,
          error: t.feed.weeklyError,
        }}
      />

      {items.length === 0 ? (
        <div className="text-center py-12 border border-stone-200 rounded-xl bg-stone-50">
          <p className="text-stone-600 mb-4">{t.feed.empty}</p>
          <Link href="/sok" className="text-olive-700 font-medium hover:underline">
            {t.feed.emptyCta} →
          </Link>
        </div>
      ) : (
        items.map((item) => (
          <div key={`${item.kind}-${item.id}`}>
            <p className="text-xs text-stone-500 mb-1">
              {t.feed.fromAuthor}{" "}
              {item.authorUsername ? (
                <Link href={`/u/${item.authorUsername}`} className="text-olive-700 hover:underline">
                  {item.authorName}
                </Link>
              ) : (
                item.authorName
              )}
            </p>
            <FeedCard
              kind={item.kind}
              kindLabels={kindLabels}
              title={item.kind === "testimony" ? item.title : kindLabels[item.kind]}
              body={item.body}
              href={item.href}
              meta={formatLocaleDate(item.publishedAt, locale)}
            />
          </div>
        ))
      )}
    </div>
  );
}
