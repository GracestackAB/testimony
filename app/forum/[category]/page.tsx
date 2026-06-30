import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { category: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("forum_categories").select("name").eq("slug", category).maybeSingle();
  return { title: data?.name ? `${data.name} – Forum` : "Forum" };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "nyss";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const supabase = await createClient();

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description, icon")
    .eq("slug", category)
    .maybeSingle();
  if (!cat) notFound();

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("id, slug, title, body, author_id, reply_count, last_reply_at, created_at, is_pinned, is_locked")
    .eq("category_id", cat.id)
    .is("deleted_at", null)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const list = threads ?? [];
  const authorIds = Array.from(new Set(list.map((t) => t.author_id).filter(Boolean) as string[]));
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, username, display_name").in("id", authorIds)
    : { data: [] };
  const authors = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <Link href="/forum" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-4">
        ← Forum
      </Link>

      <header className="mb-6 flex items-start gap-4">
        <span className="text-4xl flex-shrink-0">{cat.icon ?? "💬"}</span>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl font-semibold text-stone-900">{cat.name}</h1>
          {cat.description && <p className="text-sm text-stone-600 mt-1">{cat.description}</p>}
        </div>
        <Link
          href={`/forum/ny?kategori=${cat.slug}`}
          className="px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 flex-shrink-0"
        >
          + Ny tråd
        </Link>
      </header>

      {list.length === 0 ? (
        <div className="border border-stone-200 rounded-lg bg-parchment p-10 text-center">
          <p className="text-stone-700 font-medium mb-1">Inga trådar ännu i denna kategori.</p>
          <p className="text-sm text-stone-500">Bli först med att starta ett samtal.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => {
            const author = t.author_id ? authors.get(t.author_id) : null;
            return (
              <li key={t.id}>
                <Link
                  href={`/forum/t/${t.slug}`}
                  className={`block p-4 border rounded-lg transition-colors ${
                    t.is_pinned
                      ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
                      : "border-stone-200 bg-parchment hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2 truncate">
                      {t.is_pinned && <span title="Fastnålad" className="text-amber-600 text-sm">📌</span>}
                      {t.is_locked && <span title="Låst" className="text-stone-400 text-sm">🔒</span>}
                      <span className="truncate">{t.title}</span>
                    </h2>
                    <span className="text-xs text-stone-500 flex-shrink-0">{timeAgo(t.last_reply_at ?? t.created_at)}</span>
                  </div>
                  <p className="text-sm text-stone-600 mt-1 line-clamp-2">{t.body}</p>
                  <div className="text-xs text-stone-500 mt-2 flex items-center gap-2">
                    <span>{author ? (author.display_name ?? author.username ?? "Användare") : "Användare"}</span>
                    <span>·</span>
                    <span>{t.reply_count} {t.reply_count === 1 ? "svar" : "svar"}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
