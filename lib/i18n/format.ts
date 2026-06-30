import type { Locale } from "./types";

export function localeToBcp47(locale: Locale): string {
  return locale === "en" ? "en-GB" : "sv-SE";
}

export function formatLocaleDate(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(localeToBcp47(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
