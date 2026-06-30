"use client";
import { useEffect } from "react";

/**
 * DraftCleaner — körs i klienten på /skriv när ?sent=... finns i URL:en.
 * Rensar motsvarande localStorage-utkast så att DraftSaver inte återställer
 * en redan inskickad post nästa gång användaren öppnar sidan.
 */
const SENT_TO_KEY: Record<string, string> = {
  testimony: "testimony",
  request: "prayer_request",
  gratitude: "gratitude",
  answer: "prayer_answer",
};

export function DraftCleaner({ sent }: { sent?: string | null }) {
  useEffect(() => {
    if (!sent) return;
    const key = SENT_TO_KEY[sent];
    if (!key) return;
    try {
      localStorage.removeItem(`draft:${key}`);
    } catch {
      // ignore (incognito, quota etc.)
    }
  }, [sent]);
  return null;
}
