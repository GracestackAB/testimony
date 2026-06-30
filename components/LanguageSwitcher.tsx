"use client";

import { useLocale } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/types";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, dict, setLocale } = useLocale();

  function toggle() {
    const next: Locale = locale === "sv" ? "en" : "sv";
    void setLocale(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-stone-300 bg-stone-50 text-xs font-medium text-stone-700 hover:border-olive-500 hover:text-olive-700 transition-colors ${className}`}
      aria-label={`${dict.common.language}: ${locale === "sv" ? dict.common.english : dict.common.swedish}`}
      title={dict.common.language}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span className="uppercase tracking-wide">{locale === "sv" ? "EN" : "SV"}</span>
    </button>
  );
}
