import { createClient } from "@/lib/supabase/server";
import { PrayButton } from "@/components/PrayButton";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const revalidate = 30;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.listPages.prayerRequests.title };
}

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: requests } = await supabase
    .from("prayer_requests")
    .select("id, title, body, is_answered, created_at")
    .eq("status", "published")
    .eq("is_answered", false)
    .order("created_at", { ascending: false })
    .limit(60);

  const list = requests || [];

  const counts: Record<string, number> = {};
  const myIds = new Set<string>();
  if (list.length > 0) {
    const ids = list.map((r) => r.id);
    const { data: reacts } = await supabase
      .from("reactions")
      .select("content_id, user_id")
      .eq("content_kind", "prayer_request")
      .eq("kind", "praying")
      .in("content_id", ids);
    (reacts || []).forEach((r: { content_id: string; user_id: string }) => {
      counts[r.content_id] = (counts[r.content_id] || 0) + 1;
      if (user && r.user_id === user.id) myIds.add(r.content_id);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{t.listPages.prayerRequests.kicker}</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">{t.listPages.prayerRequests.title}</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">{t.listPages.prayerRequests.subtitle}</p>
      </header>
      {list.length === 0 ? (
        <p className="text-center text-stone-500 italic">{t.listPages.prayerRequests.empty}</p>
      ) : (
        <ul className="space-y-10">
          {list.map((r) => (
            <li key={r.id} className="border-l-4 border-olive-500 pl-5">
              {r.title && <h3 className="font-serif text-xl font-semibold text-stone-900 mb-1">{r.title}</h3>}
              <p className="text-stone-800 font-serif text-lg leading-relaxed mb-3">{r.body}</p>
              <div className="flex items-center gap-4">
                <PrayButton
                  contentId={r.id}
                  contentKind="prayer_request"
                  initialCount={counts[r.id] || 0}
                  initiallyPressed={myIds.has(r.id)}
                />
                <time className="text-xs text-stone-500">
                  {formatLocaleDate(r.created_at, locale)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
