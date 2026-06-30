"use client";

import { useState } from "react";
import type { WriteAssistKind } from "@/lib/ai/writing-assist";
import type { Locale } from "@/lib/i18n/types";
import { useDict } from "@/lib/i18n/client";

type Props = {
  kind: WriteAssistKind;
  locale: Locale;
  seedField?: string;
};

export function AiWritingAssist({ kind, locale, seedField }: Props) {
  const t = useDict();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<{
    reflectionQuestions: string[];
    outline: string[];
    toneTip: string;
    disclaimer: string;
  } | null>(null);

  async function loadAssist() {
    setBusy(true);
    setErr(null);
    setOpen(true);

    let seed = "";
    if (seedField && typeof document !== "undefined") {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${seedField}"]`
      );
      seed = el?.value || "";
    }

    const res = await fetch("/api/ai/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, locale, seed }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(json.error || t.aiWriting.fetchError);
      return;
    }
    setData(json);
  }

  const label = t.aiWriting[kind];

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={loadAssist}
        disabled={busy}
        className="text-sm text-olive-700 underline hover:text-olive-900 disabled:opacity-50"
      >
        ✨ {label}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-olive-200 bg-olive-50/60 p-4 text-sm text-stone-800">
          {busy && <p className="italic text-stone-600">{t.aiWriting.thinking}</p>}
          {err && <p className="text-red-700">{err}</p>}
          {data && !busy && (
            <div className="space-y-3">
              {data.reflectionQuestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                    {t.aiWriting.reflectionQuestions}
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {data.reflectionQuestions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.outline.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                    {t.aiWriting.suggestedOutline}
                  </p>
                  <ul className="list-decimal pl-5 space-y-1">
                    {data.outline.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.toneTip && (
                <p className="text-stone-700">
                  <span className="font-medium">{locale === "sv" ? "Ton:" : "Tone:"}</span> {data.toneTip}
                </p>
              )}
              <p className="text-xs text-stone-500">{data.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
