import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/profile/Avatar";
import { CommentList } from "@/components/engagement/CommentList";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("forum_threads").select("title").eq("slug", slug).maybeSingle();
  return { title: data?.title ? `${data.title} – Forum` : "Forum" };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, slug, category_id, author_id, title, body, status, is_pinned, is_locked, reply_count, created_at, deleted_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!thread || thread.deleted_at) notFound();

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("slug, name, icon")
    .eq("id", thread.category_id)
    .maybeSingle();

  const { data: author } = thread.author_id
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", thread.author_id).maybeSingle()
    : { data: null };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProf } = user
    ? await supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle()
    : { data: null };
  const isModerator = Boolean(myProf?.is_moderator);

  const authorName = author?.display_name ?? author?.username ?? "Användare";
  const authorHref = author?.username ? `/u/${author.username}` : `/u/id/${thread.author_id ?? ""}`;

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <nav className="mb-4 text-sm text-stone-600">
        <Link href="/forum" className="hover:text-stone-900">Forum</Link>
        {cat && (
          <>
            {" › "}
            <Link href={`/forum/${cat.slug}`} className="hover:text-stone-900">{cat.icon} {cat.name}</Link>
          </>
        )}
      </nav>

      <article className="mb-6">
        <header className="mb-4">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 flex items-center gap-2">
            {thread.is_pinned && <span className="text-amber-600 text-xl" title="Fastnålad">📌</span>}
            {thread.is_locked && <span className="text-stone-400 text-xl" title="Låst">🔒</span>}
            <span>{thread.title}</span>
          </h1>
          {author && (
            <div className="flex items-center gap-2 mt-3">
              <Link href={authorHref}>
                <Avatar src={author.avatar_url} name={authorName} size={32} />
              </Link>
              <div className="text-sm">
                <Link href={authorHref} className="font-medium text-stone-900 hover:underline">{authorName}</Link>
                <span className="text-stone-500"> · {new Date(thread.created_at).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          )}
        </header>

        <div className="prose max-w-none">
          {thread.body.split("\n\n").map((p: string, i: number) => (
            <p key={i} className="whitespace-pre-wrap">{p}</p>
          ))}
        </div>
      </article>

      {thread.is_locked && (
        <div className="mb-4 px-4 py-2 bg-stone-100 border border-stone-200 rounded text-sm text-stone-600">
          🔒 Tråden är låst — inga nya svar kan postas.
        </div>
      )}

      <CommentList
        endpoint={`/api/forum/threads/${slug}/replies`}
        deleteEndpoint={(replyId) => `/api/forum/threads/${slug}/replies/${replyId}`}
        isAuthed={Boolean(user) && !thread.is_locked}
        myUserId={user?.id ?? null}
        isModerator={isModerator}
        title="Svar"
        placeholder="Skriv ditt svar…"
        maxLength={5000}
      />
    </div>
  );
}
