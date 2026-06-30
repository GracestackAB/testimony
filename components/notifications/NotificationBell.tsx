"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Notification } from "@/lib/notifications/types";

const TYPE_ICONS: Record<string, string> = {
  testimony_published: "✓",
  testimony_rejected: "!",
  prayer_answer_added: "✦",
  prayer_marked: "🙏",
  reaction_received: "♥",
  daily_verse: "✝",
  dm_received: "✉",
  mod_queue_pending: "⚖",
  daily_bible_pending: "📖",
  system: "i",
};

// Notistyper som ska få en framhävd "moderator"-färg när de är olästa
const MOD_TYPES = new Set(["mod_queue_pending", "daily_bible_pending"]);

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "nyss";
  if (diff < 3600) return `${Math.floor(diff / 60)} min sedan`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h sedan`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d sedan`;
  return new Date(iso).toLocaleDateString("sv-SE");
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Polling: refresh unread count every 60s while document visible
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/notifications?limit=1", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setUnread(j.unread_count ?? 0);
      } catch {
        // ignore
      }
    }
    const tick = () => {
      if (document.visibilityState === "visible") poll();
    };
    const iv = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function loadList() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      const j = await res.json();
      setItems(j.notifications ?? []);
      setUnread(j.unread_count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    if (!open) {
      setOpen(true);
      await loadList();
    } else {
      setOpen(false);
    }
  }

  async function markRead(id?: string) {
    try {
      const body = id ? { ids: [id] } : { all: true };
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (id) {
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } else {
        setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
        setUnread(0);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Notiser${unread > 0 ? ` (${unread} olästa)` : ""}`}
        className="relative p-2 -m-2 text-stone-700 hover:text-stone-900 rounded-lg transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notiser"
          className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-parchment border border-stone-200 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
            <h3 className="font-serif text-base font-semibold text-stone-900">Notiser</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="text-xs text-olive-700 hover:text-olive-800 font-medium"
              >
                Markera alla som lästa
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">Laddar…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-4xl mb-2 opacity-40">🔔</div>
                <p className="text-sm text-stone-500">Inga notiser ännu.</p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const isUnread = !n.read_at;
                  const isMod = MOD_TYPES.has(n.type);
                  const inner = (
                    <>
                      <div
                        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base ${
                          isUnread
                            ? isMod
                              ? "bg-amber-600 text-white"
                              : "bg-olive-600 text-parchment"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {TYPE_ICONS[n.type] ?? "•"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-sm ${isUnread ? "font-semibold text-stone-900" : "text-stone-800"}`}>
                            {n.title}
                          </span>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                        </div>
                        {n.body && <p className="text-xs text-stone-600 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-stone-500 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </>
                  );
                  const cls = `flex items-start gap-3 px-4 py-3 transition-colors hover:bg-stone-50 ${
                    isUnread ? (isMod ? "bg-amber-50" : "bg-olive-50/50") : ""
                  }`;
                  return (
                    <li key={n.id} className="border-b border-stone-100 last:border-0">
                      {n.action_url ? (
                        <Link href={n.action_url} onClick={() => markRead(n.id)} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left ${cls}`}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <Link
              href="/konto/notiser"
              onClick={() => setOpen(false)}
              className="text-xs text-stone-700 hover:text-stone-900"
            >
              Inställningar
            </Link>
            <Link
              href="/konto/notiser?tab=alla"
              onClick={() => setOpen(false)}
              className="text-xs text-olive-700 hover:text-olive-800 font-medium"
            >
              Visa alla →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
