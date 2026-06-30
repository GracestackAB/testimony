"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { useLocale } from "@/lib/i18n/client";

type Mode = "password" | "magic";

export default function LoginPage() {
  const { locale, dict: t } = useLocale();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthErr =
      params.get("error") ||
      params.get("error_description") ||
      hash.get("error_description") ||
      hash.get("error");
    if (oauthErr) {
      setErr(authErrorMessage(oauthErr, locale));
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    }
  }, [locale]);

  function getNext() {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    return params.get("next") || "/";
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    const supabase = createClient();
    const next = getNext();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (!signInErr) {
      window.location.href = next;
      return;
    }
    setErr(authErrorMessage(signInErr.message, locale));
  }

  async function submitMagic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const next = getNext();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) setErr(authErrorMessage(error.message, locale));
    else setSent(true);
  }

  async function signInWithGoogle() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const next = getNext();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setBusy(false);
      setErr(authErrorMessage(error.message, locale));
    }
  }

  async function forgotPassword() {
    if (!email) {
      setErr(t.auth.forgotEmailFirst);
      return;
    }
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/konto/losenord`,
    });
    setBusy(false);
    if (error) setErr(authErrorMessage(error.message, locale));
    else setInfo(t.auth.resetSent.replace("{email}", email));
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{t.auth.loginTitle}</h1>
      <p className="text-stone-600 mb-6 text-sm">
        {t.auth.loginIntro}{" "}
        <Link href="/registrera" className="underline text-stone-900">
          {t.auth.createAccount}
        </Link>
      </p>

      <div className="flex gap-1 p-1 bg-stone-100 rounded-full mb-6 text-sm">
        <button
          type="button"
          onClick={() => { setMode("password"); setErr(null); setInfo(null); setSent(false); }}
          className={`flex-1 px-4 py-2 rounded-full transition-colors ${
            mode === "password" ? "bg-white shadow text-stone-900 font-medium" : "text-stone-600"
          }`}
        >
          {t.auth.passwordTab}
        </button>
        <button
          type="button"
          onClick={() => { setMode("magic"); setErr(null); setInfo(null); setSent(false); }}
          className={`flex-1 px-4 py-2 rounded-full transition-colors ${
            mode === "magic" ? "bg-white shadow text-stone-900 font-medium" : "text-stone-600"
          }`}
        >
          {t.auth.magicTab}
        </button>
      </div>

      {info && (
        <div className="mb-5 p-4 bg-olive-50 border border-olive-200 text-olive-900 rounded text-sm">{info}</div>
      )}
      {err && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-900 rounded text-sm">{err}</div>
      )}

      {mode === "magic" && sent ? (
        <p className="p-4 bg-olive-50 border border-olive-100 text-olive-800 rounded">
          {t.auth.magicSent.replace("{email}", email)}
        </p>
      ) : mode === "password" ? (
        <form onSubmit={submitPassword} className="space-y-4">
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
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 disabled:opacity-50 font-medium"
          >
            {busy ? t.auth.loginBusy : t.auth.loginBtn}
          </button>
          <button type="button" onClick={forgotPassword} className="w-full text-sm text-stone-600 hover:text-stone-900 underline">
            {t.auth.forgotPassword}
          </button>
        </form>
      ) : (
        <form onSubmit={submitMagic} className="space-y-4">
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
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 disabled:opacity-50 font-medium"
          >
            {busy ? t.auth.magicBusy : t.auth.magicBtn}
          </button>
          <p className="text-xs text-stone-500 text-center">{t.auth.magicHint}</p>
        </form>
      )}

      <div className="mt-8 border-t border-stone-200 pt-6">
        <button type="button" onClick={() => setShowAlt((v) => !v)} className="w-full text-sm text-stone-500 hover:text-stone-800">
          {showAlt ? t.auth.hideOtherMethods : t.auth.otherMethods}
        </button>
        {showAlt && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-stone-500 text-center">{t.auth.googleHint}</p>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 py-2.5 rounded-full bg-white border border-stone-300 text-stone-800 hover:border-stone-400 hover:bg-stone-50 disabled:opacity-50 font-medium transition-colors text-sm"
            >
              {t.auth.googleBtn}
            </button>
          </div>
        )}
      </div>

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
