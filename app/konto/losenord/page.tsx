"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("Lösenorden matchar inte.");
      return;
    }
    if (password.length < 8) {
      setErr("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else setOk(true);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Byt lösenord</h1>
      <p className="text-stone-600 mb-6 text-sm">
        Välj ett nytt lösenord för ditt konto. Minst 8 tecken.
      </p>

      {ok ? (
        <div className="p-4 bg-olive-50 border border-olive-200 text-olive-900 rounded">
          <div className="font-medium mb-1">Klart — lösenordet är ändrat.</div>
          <Link href="/" className="text-sm underline">Tillbaka till startsidan</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {err && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded text-sm">
              {err}
            </div>
          )}
          <label className="block">
            <span className="text-sm text-stone-700">Nytt lösenord</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full p-2.5 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700">Bekräfta lösenord</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full p-2.5 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 disabled:opacity-50 font-medium"
          >
            {busy ? "Sparar…" : "Spara nytt lösenord"}
          </button>
        </form>
      )}
    </div>
  );
}
