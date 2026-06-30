"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/profile/Avatar";

type Author = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  daily_bible_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: Author | null;
};

type Props = {
  bibleId: string;
  isAuthed: boolean;
  myUserId: string | null;
  isModerator: boolean;
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "nyss";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function BibleComments({ bibleId, isAuthed, myUserId, isModerator }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/bible/${bibleId}/comments`, { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      setComments(j.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, [bibleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/bible/${bibleId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError("Kunde inte skicka kommentaren.");
        return;
      }
      setBody("");
      if (j.comment) {
        setComments((prev) => [...prev, j.comment as Comment]);
      }
    } catch {
      setError("Nätverksfel.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Vill du ta bort kommentaren?")) return;
    const res = await fetch(`/api/bible/${bibleId}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  return (
    <section className="mt-12 border-t border-stone-200 pt-8">
      <h3 className="font-serif text-2xl font-semibold text-stone-900 mb-5">
        Kommentarer
        {comments.length > 0 && (
          <span className="ml-2 text-stone-500 text-base font-normal">({comments.length})</span>
        )}
      </h3>

      {isAuthed ? (
        <form onSubmit={handleSubmit} className="mb-8 bg-parchment border border-stone-200 rounded-lg p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Dela en reflektion eller fråga…"
            className="w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
          />
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-stone-500">{body.length}/2000</span>
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="px-4 py-1.5 rounded-md bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? "Skickar…" : "Kommentera"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 bg-parchment border border-stone-200 rounded-lg p-4 text-sm text-stone-600">
          <Link href="/login" className="text-olive-700 hover:underline font-medium">Logga in</Link>{" "}
          för att kommentera.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-stone-500">Laddar kommentarer…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-stone-500 italic">Inga kommentarer ännu — bli först med att dela.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const name = c.author?.display_name ?? c.author?.username ?? "Användare";
            const canDelete = isModerator || c.author_id === myUserId;
            const profileHref = c.author?.username ? `/u/${c.author.username}` : `/u/id/${c.author_id}`;
            return (
              <li key={c.id} className="flex gap-3">
                <Link href={profileHref} className="flex-shrink-0">
                  <Avatar src={c.author?.avatar_url ?? null} name={name} size={36} />
                </Link>
                <div className="flex-1 min-w-0 bg-parchment border border-stone-200 rounded-lg px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <Link href={profileHref} className="font-medium text-sm text-stone-900 hover:underline truncate">
                      {name}
                    </Link>
                    <span className="text-xs text-stone-500 flex-shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-stone-800 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
                  {canDelete && (
                    <div className="mt-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-[11px] text-stone-500 hover:text-red-600"
                      >
                        Ta bort
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
