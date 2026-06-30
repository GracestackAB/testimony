import { createClient } from "@/lib/supabase/server";
import { FeedCard } from "@/components/FeedCard";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const revalidate = 60;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.listPages.testimonies.title };
}

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data } = await supabase
    .from("testimonies")
    .select("id, slug, title, lede, format, cover_image_url, published_at, chain_size")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);
  const list = data || [];
  const kindLabels = t.feedKinds;
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{t.listPages.pillarKicker}</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">{t.listPages.testimonies.title}</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">{t.listPages.testimonies.subtitle}</p>
      </header>
      {list.length === 0 ? (
        <p className="text-center text-stone-500 italic">{t.listPages.testimonies.empty}</p>
      ) : (
        list.map((item) => (
          <FeedCard
            key={item.id}
            kind="testimony"
            title={item.title}
            body={item.lede || ""}
            href={`/vittnesbord/${item.slug}`}
            format={item.format}
            meta={item.published_at ? formatLocaleDate(item.published_at, locale) : ""}
            coverImage={item.cover_image_url}
            chainSize={item.chain_size}
            kindLabels={kindLabels}
            chainBadge={t.feedKinds.chainBadge}
          />
        ))
      )}
    </div>
  );
}
