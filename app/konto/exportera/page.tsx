"use client";
import { useState } from "react";
import Link from "next/link";

export default function ExportPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/export", { method: "POST" });
      if (!res.ok) {
        setErr("Kunde inte skapa export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `testimony-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <Link href="/konto" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">← Tillbaka</Link>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Ladda ner mina data</h1>
      <p className="text-sm text-stone-700 mb-6 leading-relaxed">
        Enligt GDPR har du rätt till en kopia av alla personuppgifter vi har om dig.
        Filen innehåller din profil, dina vittnesbörd, böneämnen, bönesvar, tack, reaktioner,
        volontäransökningar, gåvor och samtycken — i JSON-format.
      </p>
      {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm">{err}</div>}
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="px-5 py-2 rounded bg-olive-600 text-parchment font-medium hover:bg-olive-700 disabled:opacity-50"
      >
        {busy ? "Skapar export…" : "Ladda ner mina data (JSON)"}
      </button>
    </div>
  );
}
