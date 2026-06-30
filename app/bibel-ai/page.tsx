"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDict } from "@/lib/i18n/client";

type Source = { reference: string; content: string; similarity: number; language?: string };

function langBadge(lang: string | undefined, labels: { sv: string; en: string; he: string; el: string }): string | null {
  if (!lang) return null;
  const map: Record<string, string> = labels;
  return map[lang] ?? lang.toUpperCase();
}

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  lowConfidence?: boolean;
  followUps?: string[];
};

function BibelAiInner() {
  const t = useDict();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [prefillHandled, setPrefillHandled] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (q && !prefillHandled) {
      setInput(q);
      setPrefillHandled(true);
    }
  }, [searchParams, prefillHandled]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setErr(null);
    setNeedsLogin(false);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");

    const res = await fetch("/api/bible/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      if (res.status === 401) {
        setErr(t.bibelAi.loginRequired);
        setNeedsLogin(true);
      } else {
        setErr(data.error || t.bibelAi.genericError);
      }
      return;
    }

    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: data.answer,
        sources: data.sources,
        lowConfidence: data.lowConfidence,
        followUps: data.followUps,
      },
    ]);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <header className="mb-8 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{t.bibelAi.kicker}</div>
        <h1 className="font-serif text-4xl font-semibold text-stone-900">{t.bibelAi.title}</h1>
        <p className="mt-3 text-stone-600 text-sm max-w-lg mx-auto">{t.bibelAi.subtitle}</p>
      </header>

      {messages.length === 0 && (
        <div className="mb-8">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-3">{t.bibelAi.suggestions}</p>
          <div className="flex flex-wrap gap-2">
            {t.bibelAi.starters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="text-left text-sm px-3 py-2 rounded-full border border-stone-200 hover:border-olive-400 hover:bg-olive-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 mb-8">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 ${
              m.role === "user"
                ? "bg-stone-900 text-parchment ml-8"
                : "bg-white border border-stone-200 mr-4"
            }`}
          >
            <div className="text-xs uppercase tracking-wider mb-2 opacity-70">
              {m.role === "user" ? t.bibelAi.userLabel : t.bibelAi.assistantLabel}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
            {m.lowConfidence && (
              <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                {t.bibelAi.lowConfidence}
              </p>
            )}
            {m.sources && m.sources.length > 0 && (
              <details className="mt-4 text-xs text-stone-600">
                <summary className="cursor-pointer font-medium">
                  {t.bibelAi.sources} ({m.sources.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {m.sources.map((s, idx) => (
                    <li key={`${s.reference}-${idx}`} className="border-l-2 border-olive-300 pl-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-800">{s.reference}</span>
                        {langBadge(s.language, t.bibelAi.sourceLang) && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-olive-100 text-olive-800">
                            {langBadge(s.language, t.bibelAi.sourceLang)}
                          </span>
                        )}
                      </div>
                      <p
                        className={`italic font-serif text-stone-700 mt-0.5 ${
                          s.language === "he" ? "text-right" : ""
                        }`}
                        dir={s.language === "he" ? "rtl" : undefined}
                      >
                        {s.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {m.role === "assistant" && m.followUps && m.followUps.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{t.bibelAi.followUps}</p>
                <div className="flex flex-wrap gap-2">
                  {m.followUps.map((followUp) => (
                    <button
                      key={followUp}
                      type="button"
                      onClick={() => ask(followUp)}
                      disabled={busy}
                      className="text-left text-xs px-3 py-1.5 rounded-full border border-olive-200 text-olive-800 hover:bg-olive-50 disabled:opacity-50"
                    >
                      {followUp}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <p className="text-sm text-stone-500 italic text-center">{t.bibelAi.loading}</p>
        )}
      </div>

      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm">
          {err}
          {needsLogin && (
            <Link href="/login?next=/bibel-ai" className="underline ml-1">
              {t.bibelAi.loginLink}
            </Link>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 sticky bottom-4 bg-parchment/95 backdrop-blur py-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.bibelAi.placeholder}
          maxLength={500}
          className="flex-1 p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-olive-600/30 focus:outline-none text-sm"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-5 py-3 rounded-xl bg-stone-900 text-parchment text-sm font-medium disabled:opacity-50"
        >
          {t.bibelAi.askBtn}
        </button>
      </form>

      <p className="text-xs text-stone-400 mt-6 text-center">
        {t.bibelAi.disclaimer}{" "}
        <Link href="/dagens-bibeltext" className="underline">
          {t.bibelAi.dailyBibleLink}
        </Link>
      </p>
    </div>
  );
}

export default function BibelAiPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 py-12 text-center text-stone-500">…</div>}>
      <BibelAiInner />
    </Suspense>
  );
}
