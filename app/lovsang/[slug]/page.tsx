import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { youtubeIdFromUrl, SONG_TYPES, type SongType } from "@/lib/worship/types";
import { Reactions } from "@/components/engagement/Reactions";
import { CommentList } from "@/components/engagement/CommentList";

export const dynamic = "force-dynamic";

type Params = { slug: string };

function typeLabel(t: string | null): string {
  if (!t) return "";
  return SONG_TYPES.find((x) => x.value === t)?.label ?? "";
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("worship_songs").select("title, artist").eq("slug", slug).maybeSingle();
  if (!data) return { title: "Lovsång" };
  return { title: `${data.title}${data.artist ? " – " + data.artist : ""}` };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: song } = await supabase
    .from("worship_songs")
    .select("id, slug, title, artist, song_type, youtube_url, spotify_url, lyrics, bible_refs, description, author_id, status, published_at, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!song) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthor = user && song.author_id === user.id;
  if (song.status !== "published" && !isAuthor) {
    const { data: prof } = user
      ? await supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle()
      : { data: null };
    if (!prof?.is_moderator) notFound();
  }

  const [{ data: counts }, { data: profile }] = await Promise.all([
    supabase.rpc("get_reaction_counts", { p_kind: "worship_song", p_id: song.id }),
    user ? supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  let mine: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("reactions")
      .select("kind")
      .eq("content_kind", "worship_song")
      .eq("content_id", song.id)
      .eq("user_id", user.id);
    mine = (data ?? []).map((r) => r.kind);
  }
  const isModerator = Boolean(profile?.is_moderator);

  // Author profile
  const { data: authorProfile } = song.author_id
    ? await supabase.from("profiles").select("username, display_name").eq("id", song.author_id).maybeSingle()
    : { data: null };

  const ytId = youtubeIdFromUrl(song.youtube_url);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <Link href="/lovsang" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-6">
        ← Tillbaka till Lovsång
      </Link>

      {song.status !== "published" && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
          Status: <strong>{song.status}</strong> — endast du och moderatorer ser den här tills den är publicerad.
        </div>
      )}

      <article>
        <header className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">
            {typeLabel(song.song_type as SongType)}
          </div>
          <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-1">{song.title}</h1>
          {song.artist && <p className="text-stone-600">{song.artist}</p>}
          {authorProfile && (
            <p className="text-xs text-stone-500 mt-2">
              Delad av{" "}
              <Link
                href={authorProfile.username ? `/u/${authorProfile.username}` : `/u/id/${song.author_id}`}
                className="text-olive-700 hover:underline"
              >
                {authorProfile.display_name ?? authorProfile.username ?? "någon"}
              </Link>
            </p>
          )}
        </header>

        {ytId && (
          <div className="mb-6 aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}`}
              title={song.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}

        {song.spotify_url && !ytId && (
          <p className="mb-4">
            <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-olive-700 hover:underline">
              ▶ Lyssna på Spotify
            </a>
          </p>
        )}

        {song.description && (
          <div className="prose mb-6">
            {song.description.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
          </div>
        )}

        {song.lyrics && (
          <section className="mb-6">
            <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">Sångtext</h2>
            <pre className="whitespace-pre-wrap font-serif text-stone-800 leading-relaxed bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm">
              {song.lyrics}
            </pre>
          </section>
        )}

        {song.bible_refs && song.bible_refs.length > 0 && (
          <p className="text-sm text-stone-600 mb-6">
            <span className="font-medium">Bibelreferenser: </span>
            {song.bible_refs.join(" · ")}
          </p>
        )}

        <div className="mt-8">
          <Reactions
            endpoint={`/api/worship/${slug}/reactions`}
            initialCounts={(counts as Record<string, number>) ?? {}}
            initialMine={mine}
            isAuthed={Boolean(user)}
          />
        </div>

        <CommentList
          endpoint={`/api/worship/${slug}/comments`}
          isAuthed={Boolean(user)}
          myUserId={user?.id ?? null}
          isModerator={isModerator}
          placeholder="Vad gör den här sången med dig?"
        />
      </article>
    </div>
  );
}
