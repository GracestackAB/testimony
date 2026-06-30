"use client";
import { useEffect, useState } from "react";
import { USERNAME_REGEX } from "@/lib/profile/constants";

const REASON_LABEL: Record<string, string> = {
  invalid_format: "Måste vara 3–30 tecken (a–z, 0–9, _, -) och börja med bokstav/siffra.",
  reserved: "Det här användarnamnet är reserverat.",
  taken: "Användarnamnet är upptaget.",
  recently_used: "Användarnamnet användes nyligen av någon annan. Försök igen om en stund.",
  cooldown: "Du kan byta användarnamn igen 30 dagar efter senaste bytet.",
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  initialUsername?: string | null;
};

export function UsernameInput({ value, onChange, required, placeholder, initialUsername }: Props) {
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setStatus("idle");
      setReason(null);
      return;
    }
    if (initialUsername && value.toLowerCase() === initialUsername.toLowerCase()) {
      setStatus("idle");
      setReason(null);
      return;
    }
    if (!USERNAME_REGEX.test(value.toLowerCase())) {
      setStatus("error");
      setReason("invalid_format");
      return;
    }
    let cancelled = false;
    setStatus("checking");
    setReason(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/username-available?u=${encodeURIComponent(value)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.available) {
          setStatus("ok");
          setReason(null);
        } else {
          setStatus("error");
          setReason(json.reason ?? "taken");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setReason("invalid_format");
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, initialUsername]);

  return (
    <div>
      <label className="block text-sm font-medium text-stone-800 mb-1.5">
        Användarnamn{required ? " *" : ""}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">testimony.se/u/</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          placeholder={placeholder ?? "ditt-namn"}
          className="w-full pl-[8.5rem] pr-10 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
          autoComplete="off"
          spellCheck={false}
          maxLength={30}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
          {status === "checking" && <span className="text-stone-400">…</span>}
          {status === "ok" && <span className="text-olive-600">✓</span>}
          {status === "error" && <span className="text-red-600">✕</span>}
        </span>
      </div>
      {status === "error" && reason && (
        <p className="text-xs text-red-700 mt-1">{REASON_LABEL[reason] ?? reason}</p>
      )}
      {status === "ok" && <p className="text-xs text-olive-700 mt-1">Tillgängligt.</p>}
    </div>
  );
}
