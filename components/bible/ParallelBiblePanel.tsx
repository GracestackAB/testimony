"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";

type Passage = {
  translationId: string;
  language: string;
  label: string;
  reference: string;
  content: string;
};

type Props = {
  reference: string;
};

const LANG_ORDER = ["sv", "en", "he", "el"] as const;

const LANG_LABEL: Record<string, string> = {
  sv: "SV",
  en: "EN",
  he: "עב",
  el: "GR",
};

export function ParallelBiblePanel({ reference }: Props) {
  const t = useDict();
  const { locale } = useLocale();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [active, setActive] = useState<string>("sv");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/bible/parallel?ref=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((data: { passages?: Passage[] }) => {
        if (cancelled) return;
        const list = (data.passages ?? []).sort(
          (a, b) => LANG_ORDER.indexOf(a.language as (typeof LANG_ORDER)[number]) -
            LANG_ORDER.indexOf(b.language as (typeof LANG_ORDER)[number])
        );
        setPassages(list);
        const first = list.find((p) => p.language === (locale === "en" ? "en" : "sv")) ?? list[0];
        if (first) setActive(first.language);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reference, locale]);

  if (loading) {
    return (
      <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50/80 p-5 animate-pulse">
        <div className="h-4 w-40 bg-stone-200 rounded mb-3" />
        <div className="h-16 bg-stone-200/70 rounded" />
      </div>
    );
  }

  if (error || passages.length === 0) return null;

  const current = passages.find((p) => p.language === active) ?? passages[0];
  const isRtl = current.language === "he";
  const isOriginal = current.language === "he" || current.language === "el";

  const askOriginal =
    locale === "en"
      ? `Explain the key ${current.language === "he" ? "Hebrew" : "Greek"} words in ${reference}`
      : `Förklara de viktigaste ${current.language === "he" ? "hebreiska" : "grekiska"} orden i ${reference}`;

  async function copyCurrent() {
    const text = `${current.reference}\n\n${current.content}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-olive-200 bg-gradient-to-br from-olive-50/50 to-parchment overflow-hidden">
      <div className="px-5 py-4 border-b border-olive-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-olive-700 font-medium">
            {t.dailyBible.parallelTitle}
          </p>
          <p className="text-sm text-stone-600 mt-0.5">{t.dailyBible.parallelSubtitle}</p>
        </div>
        <div className="flex rounded-full border border-olive-200 bg-parchment p-0.5" role="tablist">
          {passages.map((p) => (
            <button
              key={p.language}
              type="button"
              role="tab"
              aria-selected={active === p.language}
              onClick={() => setActive(p.language)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                active === p.language
                  ? "bg-olive-700 text-parchment"
                  : "text-stone-600 hover:text-stone-900"
              }`}
              title={p.label}
            >
              {LANG_LABEL[p.language] ?? p.language.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="text-xs text-stone-500 mb-2">{current.label}</p>
        <blockquote
          dir={isRtl ? "rtl" : "ltr"}
          className={`text-base leading-relaxed text-stone-800 ${
            isOriginal ? "font-serif text-lg" : "font-serif italic"
          } ${isRtl ? "text-right" : ""}`}
        >
          {current.content}
        </blockquote>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyCurrent()}
            className="text-xs px-3 py-1.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50"
          >
            {copied ? t.dailyBible.copied : t.dailyBible.copyVerse}
          </button>
          {isOriginal && (
            <Link
              href={`/bibel-ai?q=${encodeURIComponent(askOriginal)}`}
              className="text-xs px-3 py-1.5 rounded-full border border-olive-400 text-olive-800 hover:bg-olive-50"
            >
              {t.dailyBible.askOriginal}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
