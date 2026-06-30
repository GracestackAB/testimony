"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { useLocale } from "@/lib/i18n/client";

export default function RegisterPage() {
  const { locale, dict: t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  function getNext() {
    if (typeof window === "undefined") return "/konto/valkommen";
    const params = new URLSearchParams(window.location.search);
    return params.get("next") || "/konto/valkommen";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr(authErrorMessage("Password should be at least 8 characters", locale));
      return;
    }
    if (password !== confirm) {
      setErr(t.auth.passwordMismatch);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const next = getNext();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: { display_name: email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      setErr(authErrorMessage(error.message, locale));
      return;
    }
    if (data.session) {
      window.location.href = next;
      return;
    }
    setNeedsConfirm(true);
    setDone(true);
  }

  if (done && needsConfirm) {
    return (
      <div className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{t.auth.confirmTitle}</h1>
        <div className="p-4 bg-olive-50 border border-olive-200 text-olive-900 rounded text-sm space-y-2">
          <p>
            {t.auth.confirmBody1} <strong>{email}</strong>.
          </p>
          <p>{t.auth.confirmBody2}</p>
        </div>
        <p className="mt-6 text-sm text-stone-600 text-center">
          <Link href="/login" className="underline text-stone-900">
            {t.auth.confirmLogin}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{t.auth.registerTitle}</h1>
      <p className="text-stone-600 mb-6 text-sm">{t.auth.registerIntro}</p>
      {err && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-900 rounded text-sm">{err}</div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-stone-700">{t.auth.email}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full p-2.5 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700">{t.auth.password}</span>
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
          <span className="text-sm text-stone-700">{t.auth.confirmPassword}</span>
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
          {busy ? t.auth.registerBusy : t.auth.registerBtn}
        </button>
      </form>
      <p className="text-sm text-stone-600 mt-6 text-center">
        {t.auth.hasAccount}{" "}
        <Link href="/login" className="underline text-stone-900">
          {t.auth.loginBtn}
        </Link>
      </p>
      <p className="text-xs text-stone-500 mt-8 text-center">
        {t.auth.termsAccept}{" "}
        <Link href="/villkor" className="underline">
          {t.auth.termsLink}
        </Link>
        .
      </p>
    </div>
  );
}
