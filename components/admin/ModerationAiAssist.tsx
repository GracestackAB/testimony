"use client";

import { useState } from "react";
import type { ModerationSuggestion } from "@/lib/ai/moderation-assist";

type Props = {
  kind: string;
  title?: string | null;
  lede?: string | null;
  body: string;
};

const LABELS: Record<string, string> = {
  approve: "Föreslår: Godkänn",
  reject: "Föreslår: Avvisa",
  review: "Föreslår: Granska noggrant",
};

const COLORS: Record<string, string> = {
  approve: "bg-olive-50 border-olive-200 text-olive-900",
  reject: "bg-red-50 border-red-200 text-red-900",
  review: "bg-amber-50 border-amber-200 text-amber-900",
};

export function ModerationAiAssist({ kind, title, lede, body }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ModerationSuggestion | null>(null);

  async function loadSuggestion() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/moderation/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, lede, content: body }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Kunde inte hämta AI-förslag.");
      return;
    }
    setSuggestion(data);
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">AI-assistent (förslag)</p>
        <button
          type="button"
          onClick={loadSuggestion}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-full border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-50"
        >
          {busy ? "Analyserar…" : suggestion ? "Uppdatera förslag" : "Be om AI-förslag"}
        </button>
      </div>

      {err && <p className="text-sm text-red-700">{err}</p>}

      {suggestion && (
        <div className={`rounded-lg border p-3 text-sm ${COLORS[suggestion.recommendation]}`}>
          <p className="font-medium">{LABELS[suggestion.recommendation]} · {suggestion.confidence}</p>
          <p className="mt-1">{suggestion.summary}</p>
          {suggestion.reasons.length > 0 && (
            <ul className="mt-2 list-disc pl-5 space-y-0.5 text-xs opacity-90">
              {suggestion.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {suggestion.flags.length > 0 && (
            <p className="mt-2 text-xs opacity-80">Flaggor: {suggestion.flags.join(", ")}</p>
          )}
          <p className="mt-2 text-xs opacity-70">Beslut fattas alltid av moderator — AI är endast stöd.</p>
        </div>
      )}
    </div>
  );
}
