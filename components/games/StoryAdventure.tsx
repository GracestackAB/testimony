"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  STORY_SCENARIOS,
  type StoryScenario,
  type StoryScenarioId,
} from "@/lib/games/story-scenarios";
import type { StoryHistoryEntry } from "@/lib/games/story-adventure";

type Beat = {
  narrative: string;
  scriptureNote?: string | null;
  choice?: string;
  reflection?: string | null;
};

type Phase = "pick" | "playing" | "ended";

export function StoryAdventure() {
  const { locale } = useLocale();
  const t = useDict().games.storyAdventure;
  const [phase, setPhase] = useState<Phase>("pick");
  const [scenario, setScenario] = useState<StoryScenario | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [beats, choices, busy]);

  const reset = useCallback(() => {
    setPhase("pick");
    setScenario(null);
    setBeats([]);
    setChoices([]);
    setErr(null);
    setNeedsLogin(false);
  }, []);

  useEffect(() => {
    reset();
  }, [locale, reset]);

  function startScenario(s: StoryScenario) {
    setScenario(s);
    setBeats([{ narrative: s.opening[locale] }]);
    setChoices(s.initialChoices[locale]);
    setPhase("playing");
    setErr(null);
  }

  function buildHistory(currentBeats: Beat[], nextChoice: string): StoryHistoryEntry[] {
    const history: StoryHistoryEntry[] = [];
    for (const beat of currentBeats) {
      if (beat.narrative) history.push({ role: "assistant", text: beat.narrative });
      if (beat.choice) history.push({ role: "user", text: beat.choice });
    }
    history.push({ role: "user", text: nextChoice });
    return history;
  }

  async function pickChoice(choice: string) {
    if (!scenario || busy || phase !== "playing") return;
    setBusy(true);
    setErr(null);
    setNeedsLogin(false);
    setChoices([]);

    const history = buildHistory(beats, choice);
    const snapshot = beats;
    setBeats([...beats, { narrative: "", choice }]);

    const res = await fetch("/api/games/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: scenario.id,
        choice,
        history: history.slice(0, -1),
      }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      if (res.status === 401) {
        setErr(t.loginRequired);
        setNeedsLogin(true);
      } else {
        setErr(data.error || t.genericError);
      }
      setChoices(scenario.initialChoices[locale]);
      setBeats(snapshot);
      return;
    }

    const turn = data.turn as {
      narrative: string;
      choices: string[];
      scriptureNote: string | null;
      ended: boolean;
      reflection: string | null;
    };

    setBeats((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) {
        next[next.length - 1] = {
          ...last,
          narrative: turn.narrative,
          scriptureNote: turn.scriptureNote,
          reflection: turn.reflection,
        };
      }
      return next;
    });

    if (turn.ended) {
      setPhase("ended");
      setChoices([]);
    } else {
      setChoices(turn.choices);
    }
  }

  if (phase === "pick") {
    return (
      <div>
        <p className="text-stone-600 text-center leading-relaxed mb-8 max-w-xl mx-auto">
          {t.pickIntro}
        </p>
        <ul className="space-y-4">
          {STORY_SCENARIOS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => startScenario(s)}
                className="w-full text-left flex items-start gap-4 p-5 border border-stone-200 rounded-xl bg-parchment hover:bg-olive-50/40 hover:border-olive-300 transition-colors"
              >
                <span className="text-3xl" aria-hidden>
                  {s.emoji}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-serif text-lg font-semibold text-stone-900">
                    {s.title[locale]}
                  </span>
                  <span className="block text-xs text-olive-700 mt-0.5">{s.bibleRef[locale]}</span>
                  <span className="block text-sm text-stone-600 mt-1">{s.tagline[locale]}</span>
                </span>
                <span className="text-olive-700 shrink-0" aria-hidden>
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {scenario && (
        <div className="mb-4 flex items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-medium text-stone-800">{scenario.title[locale]}</span>
            <span className="text-stone-500"> · {scenario.bibleRef[locale]}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-stone-500 hover:text-olive-700 whitespace-nowrap"
          >
            {t.newStory}
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="rounded-xl border border-stone-200 bg-stone-50/50 max-h-[min(55vh,28rem)] overflow-y-auto p-4 space-y-4 mb-4"
      >
        {beats.map((beat, i) => (
          <div key={`beat-${i}`}>
            {beat.choice && (
              <div className="flex justify-end mb-2">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-olive-600 text-parchment px-4 py-2.5 text-sm">
                  {beat.choice}
                </div>
              </div>
            )}
            {beat.narrative && (
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-2xl rounded-bl-md bg-white border border-stone-200 px-4 py-3 text-sm text-stone-800 leading-relaxed">
                  <p className="whitespace-pre-wrap">{beat.narrative}</p>
                  {beat.scriptureNote && (
                    <p className="mt-2 text-xs text-olive-700 font-medium">
                      📖 {beat.scriptureNote}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white border border-stone-200 px-4 py-3 text-sm text-stone-500 italic">
              {t.thinking}
            </div>
          </div>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
          {needsLogin && (
            <Link href="/login" className="block mt-2 font-medium text-olive-700 underline">
              {t.loginLink}
            </Link>
          )}
        </div>
      )}

      {phase === "ended" && beats[beats.length - 1]?.reflection && (
        <div className="mb-4 rounded-xl border border-olive-200 bg-olive-50/60 p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-olive-700 font-semibold mb-2">
            {t.reflectionLabel}
          </p>
          <p className="text-stone-800 leading-relaxed">{beats[beats.length - 1]?.reflection}</p>
        </div>
      )}

      {phase === "playing" && choices.length > 0 && !busy && (
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{t.yourMove}</p>
          <ul className="space-y-2">
            {choices.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => pickChoice(c)}
                  className="w-full text-left p-4 rounded-xl border border-stone-200 bg-white hover:border-olive-400 hover:bg-olive-50/50 text-stone-800 text-sm font-medium transition-colors"
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "ended" && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            type="button"
            onClick={() => scenario && startScenario(scenario)}
            className="px-6 py-3 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors"
          >
            {t.playAgain}
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-full border border-stone-300 text-stone-800 hover:border-olive-500 font-medium transition-colors"
          >
            {t.chooseAnother}
          </button>
          <Link
            href="/spel"
            className="px-6 py-3 rounded-full border border-stone-300 text-stone-800 hover:border-olive-500 font-medium transition-colors text-center"
          >
            {t.backToGames}
          </Link>
        </div>
      )}

      <p className="mt-6 text-xs text-stone-400 text-center leading-relaxed">{t.disclaimer}</p>
    </div>
  );
}
