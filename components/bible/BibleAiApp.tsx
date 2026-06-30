"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDict } from "@/lib/i18n/client";
import type { BibleAiMode } from "@/lib/bible/rag-prompts";

type Source = { reference: string; content: string; similarity: number; language?: string };

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  lowConfidence?: boolean;
  followUps?: string[];
};

function langBadge(
  lang: string | undefined,
  labels: { sv: string; en: string; he: string; el: string }
): string | null {
  if (!lang) return null;
  const map: Record<string, string> = labels;
  return map[lang] ?? lang.toUpperCase();
}

function BibleAiInner() {
  const t = useDict();
  const g = t.bibelAi;
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<BibleAiMode>("guide");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [prefillHandled, setPrefillHandled] = useState(false);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    const tab = searchParams.get("tab");
    if (tab === "professor") setMode("professor");
    if (q && !prefillHandled) {
      setInput(q);
      setPrefillHandled(true);
    }
  }, [searchParams, prefillHandled]);

  const tabs: { id: BibleAiMode; label: string; hint: string }[] = [
    { id: "guide", label: g.tabGuide, hint: g.tabGuideHint },
    { id: "professor", label: g.tabProfessor, hint: g.tabProfessorHint },
  ];

  const starters = mode === "professor" ? g.startersProfessor : g.starters;
  const assistantLabel = mode === "professor" ? g.professorLabel : g.assistantLabel;
  const loadingText = mode === "professor" ? g.loadingProfessor : g.loading;

  function historyForApi(): Array<{ role: "user" | "assistant"; content: string }> {
    return messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.text,
    }));
  }

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
      body: JSON.stringify({
        question: q,
        mode,
        history: historyForApi(),
      }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      if (res.status === 401) {
        setErr(g.loginRequired);
        setNeedsLogin(true);
      } else {
        setErr(data.error || g.genericError);
      }
      return;
    }

    if (data.rateLimit?.remaining !== undefined) {
      setRateRemaining(data.rateLimit.remaining);
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

  function switchMode(next: BibleAiMode) {
    if (next === mode) return;
    setMode(next);
    setMessages([]);
    setErr(null);
    setRateRemaining(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <header className="mb-8 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{g.kicker}</div>
        <h1 className="font-serif text-4xl font-semibold text-stone-900">{g.title}</h1>
        <p className="mt-3 text-stone-600 text-sm max-w-lg mx-auto">{g.subtitle}</p>
      </header>

      <div className="flex rounded-full border border-stone-200 p-1 mb-3 bg-stone-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchMode(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-full text-sm font-medium transition-colors ${
              mode === tab.id ? "bg-olive-600 text-parchment shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone-500 text-center mb-8 leading-relaxed">
        {mode === "professor" ? g.tabProfessorHint : g.tabGuideHint}
      </p>

      {rateRemaining !== null && (
        <p className="text-xs text-stone-400 text-center mb-4">
          {g.rateRemaining.replace("{n}", String(rateRemaining))}
        </p>
      )}

      {messages.length === 0 && (
        <div className="mb-8">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-3">{g.suggestions}</p>
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
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
              {m.role === "user" ? g.userLabel : assistantLabel}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
            {m.lowConfidence && (
              <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                {g.lowConfidence}
              </p>
            )}
            {m.sources && m.sources.length > 0 && (
              <details className="mt-4 text-xs text-stone-600">
                <summary className="cursor-pointer font-medium">
                  {g.sources} ({m.sources.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {m.sources.map((s, idx) => (
                    <li key={`${s.reference}-${idx}`} className="border-l-2 border-olive-300 pl-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-800">{s.reference}</span>
                        {langBadge(s.language, g.sourceLang) && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-olive-100 text-olive-800">
                            {langBadge(s.language, g.sourceLang)}
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
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{g.followUps}</p>
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
          <p className="text-sm text-stone-500 italic text-center">{loadingText}</p>
        )}
      </div>

      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm">
          {err}
          {needsLogin && (
            <Link href={`/login?next=/bibel-ai${mode === "professor" ? "?tab=professor" : ""}`} className="underline ml-1">
              {g.loginLink}
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
          placeholder={mode === "professor" ? g.placeholderProfessor : g.placeholder}
          maxLength={mode === "professor" ? 800 : 500}
          className="flex-1 p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-olive-600/30 focus:outline-none text-sm"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-5 py-3 rounded-xl bg-stone-900 text-parchment text-sm font-medium disabled:opacity-50"
        >
          {g.askBtn}
        </button>
      </form>

      <p className="text-xs text-stone-400 mt-6 text-center">
        {g.disclaimer}{" "}
        <Link href="/dagens-bibeltext" className="underline">
          {g.dailyBibleLink}
        </Link>
      </p>
    </div>
  );
}

export function BibleAiApp() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 py-12 text-center text-stone-500">…</div>}>
      <BibleAiInner />
    </Suspense>
  );
}
