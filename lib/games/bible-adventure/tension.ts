import type { Locale } from "@/lib/i18n/types";

export const DEFAULT_TENSION = 35;
export const MIN_TENSION = 0;
export const MAX_TENSION = 100;

export function clampTension(value: number): number {
  return Math.max(MIN_TENSION, Math.min(MAX_TENSION, Math.round(value)));
}

export function clampTensionDelta(raw: unknown): number {
  const n = typeof raw === "number" ? raw : 0;
  return Math.max(-20, Math.min(20, Math.round(n)));
}

export function tensionLabel(tension: number, locale: Locale): string {
  if (tension >= 80) return locale === "sv" ? "Ödesögonblick" : "Climactic";
  if (tension >= 60) return locale === "sv" ? "Hög dramatik" : "High stakes";
  if (tension >= 40) return locale === "sv" ? "Växande spänning" : "Rising tension";
  if (tension >= 20) return locale === "sv" ? "Lugnt ögonblick" : "Quiet moment";
  return locale === "sv" ? "Frid" : "Peace";
}

export function tensionColor(tension: number): string {
  if (tension >= 80) return "bg-violet-600";
  if (tension >= 60) return "bg-rose-500";
  if (tension >= 40) return "bg-amber-500";
  return "bg-stone-400";
}
