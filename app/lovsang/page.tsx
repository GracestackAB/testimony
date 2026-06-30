import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SONG_TYPES, type SongType } from "@/lib/worship/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Lovsång",
  description: "Lovsånger, psalmer och musik som lyfter blicken till Jesus",
};

function typeLabel(t: string | null): string {
  if (!t) return "";
  return SONG_TYPES.find((x) => x.value === t)?.label ?? "";
}

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worship_songs")
    .select("id, slug, title, artist, song_type, description, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  const songs = data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">Sjung till Herren</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">Lovsång</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">
          Sånger, psalmer och musik som lyft blicken till Jesus.
          Dela egna favoriter, eller lyssna på vad andra valt.
        </p>
        <div className="mt-6">
          <Link href="/lovsang/ny" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 text-sm font-medium">
            <span>+ Dela en lovsång</span>
          </Link>
        </div>
      </header>

      {songs.length === 0 ? (
        <div className="border border-stone-200 rounded-lg bg-parchment p-10 text-center">
          <div className="text-5xl mb-3 opacity-40">🎵</div>
          <p className="text-stone-700 mb-1 font-medium">Inga lovsånger ännu.</p>
          <p className="text-sm text-stone-500">Bli först — dela en sång som lyfter ditt hjärta.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {songs.map((s) => (
            <li key={s.id}>
              <Link
                href={`/lovsang/${s.slug}`}
                className="block p-5 border border-stone-200 rounded-lg bg-parchment hover:bg-stone-50 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-serif text-xl font-semibold text-stone-900 group-hover:underline">
                    {s.title}
                  </h2>
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 flex-shrink-0">
                    {typeLabel(s.song_type as SongType)}
                  </span>
                </div>
                {s.artist && <p className="text-sm text-stone-600 mt-0.5">{s.artist}</p>}
                {s.description && (
                  <p className="text-sm text-stone-700 mt-2 line-clamp-2">{s.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
