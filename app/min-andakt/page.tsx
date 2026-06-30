import { redirect } from "next/navigation";
import { SpiritualJournalApp } from "@/components/spiritual-journal/SpiritualJournalApp";
import { countJournalEntriesByCategory } from "@/lib/spiritual-journal/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: `${t.spiritualJournal.title} · testimony.se`,
    description: t.spiritualJournal.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function MinAndaktPage() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/min-andakt");

  const locale = await getLocale();
  const t = getDictionary(locale);
  const counts = await countJournalEntriesByCategory();

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">
          {t.nav.spiritualJournalKicker}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">
          {t.spiritualJournal.title}
        </h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">{t.spiritualJournal.subtitle}</p>
      </header>

      <SpiritualJournalApp initialCounts={counts} />
    </div>
  );
}
