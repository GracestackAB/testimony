import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Forum",
  description: "Diskutera idéer, dela tankar och samtala om tro på testimony.se",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "nyss";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default async function Page() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description, icon, sort_order")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  // Senaste trådar för aktivitet
  const { data: recentThreads } = await supabase
    .from("forum_threads")
    .select("id, slug, category_id, title, last_reply_at, created_at, reply_count")
    .is("deleted_at", null)
    .eq("status", "published")
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .limit(8);

  const cats = categories ?? [];
  const recent = recentThreads ?? [];
  const catMap = new Map(cats.map((c) => [c.id, c]));

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">Samtal i Kristus</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">Forum</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">
          Dela idéer, ställ frågor, samtala om tro och vardag. Var vänlig och kärleksfull.
        </p>
        <div className="mt-6">
          <Link href="/forum/ny" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 text-sm font-medium">
            + Ny tråd
          </Link>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-4">Kategorier</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cats.map((c) => (
            <li key={c.id}>
              <Link
                href={`/forum/${c.slug}`}
                className="block p-4 border border-stone-200 rounded-lg bg-parchment hover:bg-stone-50 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{c.icon ?? "💬"}</span>
                  <div className="min-w-0">
                    <div className="font-serif text-lg font-semibold text-stone-900">{c.name}</div>
                    {c.description && (
                      <p className="text-sm text-stone-600 mt-0.5 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-4">Senaste aktivitet</h2>
          <ul className="space-y-2">
            {recent.map((t) => {
              const cat = catMap.get(t.category_id);
              return (
                <li key={t.id}>
                  <Link
                    href={`/forum/t/${t.slug}`}
                    className="flex items-baseline justify-between gap-3 p-3 border border-stone-200 rounded-lg bg-parchment hover:bg-stone-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-stone-900 font-medium truncate">{t.title}</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {cat && <span>{cat.icon} {cat.name} · </span>}
                        {t.reply_count} {t.reply_count === 1 ? "svar" : "svar"} · senast {timeAgo(t.last_reply_at ?? t.created_at)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
