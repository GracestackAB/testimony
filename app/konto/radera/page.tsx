"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [keep, setKeep] = useState(true);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleDelete() {
    if (confirm !== "RADERA") {
      setErr("Du måste skriva RADERA för att bekräfta.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keep_contributions: keep, confirm }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Kunde inte radera kontot.");
        return;
      }
      router.replace("/?deleted=1");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <Link href="/konto" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">← Tillbaka</Link>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Radera konto</h1>
      <p className="text-sm text-stone-700 mb-6 leading-relaxed">
        Detta tar bort all din personliga information. Åtgärden går inte att ångra.
      </p>

      <div className="space-y-3 mb-6">
        <label className={`flex items-start gap-3 p-4 border rounded cursor-pointer transition-colors ${
          keep ? "border-olive-600 bg-olive-50" : "border-stone-200 bg-parchment"
        }`}>
          <input type="radio" checked={keep} onChange={() => setKeep(true)} className="mt-1 accent-olive-600" />
          <div>
            <div className="font-medium text-stone-900">Anonymisera mig — behåll mina vittnesbörd</div>
            <div className="text-sm text-stone-600">
              Din profil raderas. Dina vittnesbörd, böneämnen och bönesvar finns kvar
              men visas som <em>Anonym vän</em>. Detta tjänar gemenskapen som har påverkats av det du delat.
            </div>
          </div>
        </label>
        <label className={`flex items-start gap-3 p-4 border rounded cursor-pointer transition-colors ${
          !keep ? "border-red-500 bg-red-50" : "border-stone-200 bg-parchment"
        }`}>
          <input type="radio" checked={!keep} onChange={() => setKeep(false)} className="mt-1 accent-red-500" />
          <div>
            <div className="font-medium text-stone-900">Radera allt jag skrivit</div>
            <div className="text-sm text-stone-600">
              Allt du delat tas bort permanent: vittnesbörd, böneämnen, bönesvar, tack, reaktioner.
            </div>
          </div>
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-stone-800 mb-1.5">
          Skriv <span className="font-mono bg-stone-100 px-1">RADERA</span> för att bekräfta
        </label>
        <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-red-500" />
      </div>

      {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm">{err}</div>}

      <button
        type="button"
        onClick={handleDelete}
        disabled={busy || confirm !== "RADERA"}
        className="px-5 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? "Raderar…" : "Radera mitt konto permanent"}
      </button>
    </div>
  );
}
