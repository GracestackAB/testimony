"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/types";

type Digest = {
  summary: string;
  highlights: string[];
  prayer_focus: string | null;
  item_count: number;
  week_start: string;
};

type Props = {
  locale: Locale;
  followingCount: number;
  labels: {
    title: string;
    subtitle: string;
    loading: string;
    refresh: string;
    emptyNetwork: string;
    prayer: string;
    itemCount: string;
    error: string;
  };
};

export function WeeklyDigestCard({ locale, followingCount, labels }: Props) {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(force = false) {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/ai/feed-digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, force }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || labels.error);
      return;
    }
    setDigest(data.digest);
  }

  useEffect(() => {
    if (followingCount > 0) {
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followingCount, locale]);

  if (followingCount === 0) {
    return null;
  }

  return (
    <section className="mb-10 rounded-xl border border-olive-200 bg-gradient-to-br from-olive-50 to-parchment p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-olive-700/80">AI</p>
          <h2 className="font-serif text-xl font-semibold text-stone-900">{labels.title}</h2>
          <p className="text-sm text-stone-600 mt-1">{labels.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-full border border-olive-300 bg-white hover:bg-olive-50 disabled:opacity-50"
        >
          {busy ? labels.loading : labels.refresh}
        </button>
      </div>

      {err && <p className="text-sm text-red-700 mb-2">{err}</p>}

      {busy && !digest && (
        <p className="text-sm text-stone-500 italic">{labels.loading}</p>
      )}

      {digest && (
        <div className="space-y-3 text-sm text-stone-800">
          <p className="whitespace-pre-wrap leading-relaxed">{digest.summary}</p>
          {digest.highlights.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              {digest.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
          {digest.prayer_focus && (
            <p className="text-olive-800 bg-white/70 border border-olive-100 rounded-lg px-3 py-2">
              <span className="font-medium">{labels.prayer}</span> {digest.prayer_focus}
            </p>
          )}
          <p className="text-xs text-stone-500">
            {labels.itemCount.replace("{n}", String(digest.item_count))}
          </p>
        </div>
      )}
    </section>
  );
}
