"use client";
import { useState } from "react";
import { POLICY_VERSIONS } from "@/lib/profile/constants";

type Props = {
  initialGranted: boolean;
  onChange: (granted: boolean) => void;
};

export function DenominationConsent({ initialGranted, onChange }: Props) {
  const [granted, setGranted] = useState(initialGranted);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/profile/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent_type: "special_category_religion",
          granted: next,
          policy_version: POLICY_VERSIONS.special_category,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Kunde inte spara samtycket.");
        return;
      }
      setGranted(next);
      onChange(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-gold-300 bg-gold-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="text-gold-700 font-serif text-xl leading-none mt-0.5">⚠</div>
        <div className="flex-1">
          <h3 className="font-serif font-semibold text-stone-900 mb-1">Känsliga personuppgifter</h3>
          <p className="text-sm text-stone-700 leading-relaxed mb-3">
            Samfund, roll i församlingen, frälsningsdag och favoritbibelvers är{" "}
            <strong>känsliga personuppgifter</strong> enligt GDPR (artikel 9, religiös övertygelse).
            Vi behöver ditt uttryckliga samtycke för att lagra dem. Du kan när som helst återkalla samtycket
            — då raderas fälten direkt.
          </p>
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={granted}
              onChange={(e) => toggle(e.target.checked)}
              disabled={busy}
              className="mt-1 accent-olive-600"
            />
            <span className="text-sm text-stone-800">
              Jag samtycker till att testimony.se behandlar mina religiösa uppgifter (samfund, roll,
              frälsningsdag, favoritvers) i syfte att visa dem på min profil enligt mina synlighetsval.
            </span>
          </label>
          {err && <p className="text-sm text-red-700 mt-2">{err}</p>}
        </div>
      </div>
    </div>
  );
}
