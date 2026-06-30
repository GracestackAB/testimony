"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/profile/Avatar";
import { StartConversationButton } from "@/components/messages/StartConversationButton";
import { useDict } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/types";

type Result = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  church: string | null;
  denomination: string | null;
  ministry_focus: string | null;
  open_to_connect: boolean;
  open_to_serve: boolean;
};

type Props = { currentUserId: string | null; locale?: Locale };

export function ProfileSearch({ currentUserId }: Props) {
  const t = useDict();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/profile/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        const j = await res.json();
        setResults(j.results ?? []);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced sökning
  useEffect(() => {
    const t = setTimeout(() => {
      void search(q);
      const sp = new URLSearchParams(window.location.search);
      if (q) sp.set("q", q);
      else sp.delete("q");
      const newUrl = `${window.location.pathname}${sp.toString() ? `?${sp}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div>
      <div className="relative mb-6">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.network.subtitle}
          autoFocus
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-stone-300 bg-parchment text-base focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        />
      </div>

      {loading && q.length >= 2 && (
        <p className="text-sm text-stone-500">{t.common.loading}</p>
      )}

      {!loading && q.length >= 2 && searched && results.length === 0 && (
        <div className="text-center py-10 border border-stone-200 rounded-lg bg-parchment">
          <div className="text-4xl mb-2 opacity-40">🔍</div>
          <p className="text-stone-700">Inga profiler matchade <em>“{q}”</em>.</p>
        </div>
      )}

      {!loading && q.length < 2 && (
        <p className="text-sm text-stone-500">Skriv minst två tecken för att söka.</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => {
            const name = r.display_name ?? r.username ?? "Användare";
            const href = r.username ? `/u/${r.username}` : `/u/id/${r.id}`;
            const subtitle = [r.city, r.church].filter(Boolean).join(" · ");
            const canMessage = Boolean(currentUserId && currentUserId !== r.id);
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 bg-parchment hover:bg-stone-50 transition-colors"
              >
                <Link href={href} className="flex-shrink-0">
                  <Avatar src={r.avatar_url} name={name} size={48} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={href} className="block group">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-stone-900 truncate group-hover:underline">{name}</span>
                      {r.username && (
                        <span className="text-xs text-stone-500 truncate">@{r.username}</span>
                      )}
                    </div>
                    {r.headline && <p className="text-sm text-stone-800 mt-1 line-clamp-1">{r.headline}</p>}
                    {subtitle && <p className="text-xs text-stone-600 mt-0.5 truncate">{subtitle}</p>}
                    {r.bio && <p className="text-sm text-stone-700 mt-1 line-clamp-2">{r.bio}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {r.open_to_connect && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-olive-50 text-olive-700">{t.network.openToConnect}</span>
                      )}
                      {r.open_to_serve && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-300/20 text-gold-700">{t.network.openToServe}</span>
                      )}
                    </div>
                  </Link>
                  {canMessage && (
                    <div className="mt-2">
                      <StartConversationButton
                        recipientId={r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-olive-600 text-parchment text-xs font-medium hover:bg-olive-700 transition-colors"
                      >
                        Skicka meddelande
                      </StartConversationButton>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
