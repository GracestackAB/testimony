"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bibleId: string;
  initialCounts?: Record<string, number>;
  initialMine?: string[];
  isAuthed: boolean;
};

const REACTIONS: { kind: string; label: string; emoji: string }[] = [
  { kind: "heart", label: "Hjärta", emoji: "❤️" },
  { kind: "amen", label: "Amen", emoji: "🙌" },
  { kind: "hallelujah", label: "Halleluja", emoji: "✨" },
  { kind: "praying", label: "Be", emoji: "🙏" },
];

export function BibleReactions({ bibleId, initialCounts = {}, initialMine = [], isAuthed }: Props) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<Set<string>>(new Set(initialMine));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/bible/${bibleId}/reactions`, { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      if (cancelled) return;
      setCounts(j.counts ?? {});
      setMine(new Set<string>(j.mine ?? []));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [bibleId]);

  async function toggle(kind: string) {
    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(kind);
    const wasActive = mine.has(kind);
    // Optimistisk
    setMine((prev) => {
      const next = new Set(prev);
      if (wasActive) next.delete(kind);
      else next.add(kind);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [kind]: Math.max(0, (prev[kind] ?? 0) + (wasActive ? -1 : 1)),
    }));
    try {
      const res = await fetch(`/api/bible/${bibleId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        // Återställ
        setMine((prev) => {
          const next = new Set(prev);
          if (wasActive) next.add(kind);
          else next.delete(kind);
          return next;
        });
        setCounts((prev) => ({
          ...prev,
          [kind]: Math.max(0, (prev[kind] ?? 0) + (wasActive ? 1 : -1)),
        }));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map((r) => {
        const active = mine.has(r.kind);
        const count = counts[r.kind] ?? 0;
        return (
          <button
            key={r.kind}
            type="button"
            onClick={() => toggle(r.kind)}
            disabled={busy === r.kind}
            aria-pressed={active}
            aria-label={`${r.label}${count > 0 ? `, ${count}` : ""}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
              active
                ? "bg-olive-50 border-olive-400 text-olive-800"
                : "bg-parchment border-stone-300 text-stone-700 hover:border-stone-400 hover:bg-stone-50"
            } ${busy === r.kind ? "opacity-50" : ""}`}
          >
            <span aria-hidden className="text-base leading-none">{r.emoji}</span>
            <span className="font-medium">{r.label}</span>
            {count > 0 && (
              <span className={`text-xs ${active ? "text-olive-700" : "text-stone-500"}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
