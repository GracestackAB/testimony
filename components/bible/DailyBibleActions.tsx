"use client";

import { useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  bibleId: string;
  reference: string;
  textBody: string;
  explanation: string;
  isAuthed: boolean;
};

export function DailyBibleActions({
  bibleId,
  reference,
  textBody,
  explanation,
  isAuthed,
}: Props) {
  const t = useDict();
  const { locale } = useLocale();
  const [journalBusy, setJournalBusy] = useState(false);
  const [journalDone, setJournalDone] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const askQuestion =
    locale === "en"
      ? `What does ${reference} mean, and how can I live it out today?`
      : `Vad betyder ${reference} och hur kan jag leva ut det idag?`;

  const askHref = `/bibel-ai?q=${encodeURIComponent(askQuestion)}`;

  async function saveToJournal() {
    if (!isAuthed || journalBusy || journalDone) return;
    setJournalBusy(true);

    const body =
      locale === "en"
        ? `${textBody}\n\n— ${reference}\n\nReflection: ${explanation.split("\n\n")[0] ?? ""}`
        : `${textBody}\n\n— ${reference}\n\nReflektion: ${explanation.split("\n\n")[0] ?? ""}`;

    const res = await fetch("/api/spiritual-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "scripture",
        title: reference,
        body,
        scripture_ref: reference,
        metadata: { daily_bible_id: bibleId, source: "daily_bible" },
      }),
    });

    setJournalBusy(false);
    if (res.ok) setJournalDone(true);
  }

  async function copyVerse() {
    const text = `${reference}\n\n${textBody}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      // clipboard blocked
    }
  }

  async function shareVerse() {
    const text = `${reference}: ${textBody}`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/dagens-bibeltext` : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: reference,
          text,
          url,
        });
        return;
      } catch {
        // user cancelled
      }
    }
    await copyVerse();
  }

  const btn =
    "inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors";

  return (
    <div className="mt-8 pt-6 border-t border-stone-200">
      <p className="text-xs uppercase tracking-widest text-stone-500 mb-3">{t.dailyBible.actionsTitle}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={askHref}
          className={`${btn} bg-olive-700 text-parchment hover:bg-olive-800`}
        >
          {t.dailyBible.askAboutVerse}
        </Link>

        {isAuthed ? (
          <button
            type="button"
            onClick={() => void saveToJournal()}
            disabled={journalBusy || journalDone}
            className={`${btn} border border-stone-300 text-stone-800 hover:border-olive-500 hover:text-olive-800 disabled:opacity-60`}
          >
            {journalDone ? t.dailyBible.savedToJournal : t.dailyBible.saveToJournal}
          </button>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent("/dagens-bibeltext")}`}
            className={`${btn} border border-stone-300 text-stone-800 hover:border-olive-500`}
          >
            {t.dailyBible.saveToJournalLogin}
          </Link>
        )}

        <button
          type="button"
          onClick={() => void copyVerse()}
          className={`${btn} border border-stone-300 text-stone-700 hover:bg-stone-50`}
        >
          {copyDone ? t.dailyBible.copied : t.dailyBible.copyVerse}
        </button>

        <button
          type="button"
          onClick={() => void shareVerse()}
          className={`${btn} border border-stone-300 text-stone-700 hover:bg-stone-50`}
        >
          {t.dailyBible.shareVerse}
        </button>
      </div>
    </div>
  );
}
