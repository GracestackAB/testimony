import { cookies, headers } from "next/headers";
import { en } from "./locales/en";
import { sv } from "./locales/sv";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Dictionary,
  type Locale,
} from "./types";

export * from "./types";

const dictionaries: Record<Locale, Dictionary> = { sv, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "sv" || value === "en";
}

/** Läser språk från cookie, Accept-Language eller default. */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  if (/\ben\b/i.test(accept) && !/\bsv\b/i.test(accept.split(",")[0] ?? "")) {
    return "en";
  }
  return DEFAULT_LOCALE;
}

export { localeToBcp47, formatLocaleDate } from "./format";
