"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { UsernameInput } from "@/components/profile/UsernameInput";
import { DenominationConsent } from "@/components/profile/DenominationConsent";
import {
  DENOMINATIONS,
  ROLES_IN_CHURCH,
  POLICY_VERSIONS,
} from "@/lib/profile/constants";
import type { Profile } from "@/lib/profile/types";

const STEP_TITLES = ["Visningsnamn", "Säg mer om dig", "Tro & församling", "Synlighet", "Klart"];

export function OnboardingWizard({ profile: initial }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1
  const [firstName, setFirstName] = useState(initial.first_name ?? "");
  const [lastName, setLastName] = useState(initial.last_name ?? "");
  const [username, setUsername] = useState(initial.username ?? "");

  // Step 2
  const [bio, setBio] = useState(initial.bio ?? "");
  const [city, setCity] = useState(initial.city ?? "");

  // Step 3
  const [hasConsent, setHasConsent] = useState(initial.consent_special_category_at !== null);
  const [church, setChurch] = useState(initial.church ?? "");
  const [denomination, setDenomination] = useState(initial.denomination ?? "");
  const [role, setRole] = useState(initial.role_in_church ?? "");
  const [believerSince, setBelieverSince] = useState(initial.believer_since ?? "");
  const [favoriteVerse, setFavoriteVerse] = useState(initial.favorite_verse ?? "");

  // Step 4
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "update_failed");
    }
    setProfile((p) => ({ ...p, ...json } as Profile));
    return json;
  }

  async function handleNext() {
    setBusy(true);
    setErr(null);
    try {
      if (step === 0) {
        const display = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
        if (!display) {
          setErr("Skriv ditt förnamn (eller åtminstone ett visningsnamn).");
          return;
        }
        await patch({
          first_name: firstName || null,
          last_name: lastName || null,
          display_name: display,
          username: username || null,
        });
      } else if (step === 1) {
        await patch({ bio: bio || null, city: city || null });
      } else if (step === 2) {
        const payload: Record<string, unknown> = { church: church || null };
        if (hasConsent) {
          payload.denomination = denomination || null;
          payload.role_in_church = role || null;
          payload.believer_since = believerSince || null;
          payload.favorite_verse = favoriteVerse || null;
        }
        await patch(payload);
      } else if (step === 3) {
        // visibility step is informational only — defaults already applied
      } else if (step === 4) {
        if (!tosAccepted || !privacyAccepted) {
          setErr("Du måste godkänna villkor och integritetspolicy.");
          return;
        }
        // log consent for tos + privacy
        await Promise.all([
          fetch("/api/profile/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consent_type: "tos", granted: true, policy_version: POLICY_VERSIONS.tos }),
          }),
          fetch("/api/profile/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consent_type: "privacy_policy", granted: true, policy_version: POLICY_VERSIONS.privacy }),
          }),
          newsletter
            ? fetch("/api/profile/consent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consent_type: "newsletter", granted: true, policy_version: POLICY_VERSIONS.newsletter }),
              })
            : Promise.resolve(),
        ]);
        await fetch("/api/account/onboarding-complete", { method: "POST" });
        router.replace("/konto");
        router.refresh();
        return;
      }
      setStep(step + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Något gick fel.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    setErr(null);
    try {
      await Promise.all([
        fetch("/api/profile/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent_type: "tos", granted: true, policy_version: POLICY_VERSIONS.tos }),
        }),
        fetch("/api/profile/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent_type: "privacy_policy", granted: true, policy_version: POLICY_VERSIONS.privacy }),
        }),
      ]);
      await fetch("/api/account/onboarding-complete", { method: "POST" });
      router.replace("/konto");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Något gick fel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Välkommen!</h1>
        <p className="text-stone-700 text-sm">
          Låt oss snabbt sätta upp din profil. Allt utom villkor är frivilligt.
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_TITLES.map((title, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-olive-600" : "bg-stone-200"}`}
            title={title}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="mb-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-serif text-xl font-semibold text-stone-900">Vad ska vi kalla dig?</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1.5">Förnamn *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1.5">Efternamn</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                  maxLength={80}
                />
              </div>
            </div>
            <UsernameInput value={username} onChange={setUsername} initialUsername={profile.username} />
            <p className="text-xs text-stone-500">
              Användarnamnet är frivilligt och används i din profil-URL: testimony.se/u/...
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-serif text-xl font-semibold text-stone-900">Säg gärna lite mer</h2>
            <AvatarUpload
              currentUrl={profile.avatar_url}
              name={profile.display_name}
              onUploaded={(url) => setProfile((p) => ({ ...p, avatar_url: url }))}
              onDeleted={() => setProfile((p) => ({ ...p, avatar_url: null }))}
            />
            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1.5">Kort bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 240))}
                rows={3}
                placeholder="Vem är du? (valfritt, max 240 tecken)"
                className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
              />
              <p className="text-xs text-stone-500 mt-1">{bio.length}/240</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1.5">Stad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="t.ex. Stockholm"
                className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                maxLength={80}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-serif text-xl font-semibold text-stone-900">Tro & församling</h2>
            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1.5">Församling</label>
              <input
                type="text"
                value={church}
                onChange={(e) => setChurch(e.target.value)}
                placeholder="t.ex. Pingstkyrkan Linköping"
                className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                maxLength={160}
              />
            </div>

            <DenominationConsent initialGranted={hasConsent} onChange={setHasConsent} />

            <fieldset disabled={!hasConsent} className="space-y-4 disabled:opacity-50">
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1.5">Samfund</label>
                <select
                  value={denomination}
                  onChange={(e) => setDenomination(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                >
                  <option value="">— välj —</option>
                  {DENOMINATIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1.5">Roll i församlingen</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                >
                  <option value="">— välj —</option>
                  {ROLES_IN_CHURCH.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1.5">
                  Frälsningsdag <span className="text-stone-500">(ungefär när jag mötte Jesus)</span>
                </label>
                <input
                  type="date"
                  value={believerSince}
                  onChange={(e) => setBelieverSince(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1.5">Favoritbibelvers</label>
                <input
                  type="text"
                  value={favoriteVerse}
                  onChange={(e) => setFavoriteVerse(e.target.value)}
                  placeholder='t.ex. "Jeremia 29:11"'
                  className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500"
                  maxLength={240}
                />
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-serif text-xl font-semibold text-stone-900">Synlighet</h2>
            <p className="text-sm text-stone-700">
              Din profil är som standard <strong>publik</strong>, men känsliga fält som samfund och frälsningsdag
              är dolda för icke-inloggade. Du kan finjustera detta när som helst under{" "}
              <Link href="/konto/integritet" className="text-olive-700 underline">Synlighet & samtycke</Link>.
            </p>
            <ul className="text-sm text-stone-700 space-y-1.5 list-disc list-inside">
              <li>Bio, ort, församling, favoritvers: <strong>publik</strong></li>
              <li>Samfund, roll: <strong>endast inloggade</strong></li>
              <li>Frälsningsdag: <strong>privat</strong></li>
            </ul>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-serif text-xl font-semibold text-stone-900">Sista steget</h2>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} className="mt-1 accent-olive-600" />
              <span className="text-sm text-stone-800">
                Jag godkänner <Link href="/villkor" className="text-olive-700 underline">användarvillkoren</Link>. *
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-1 accent-olive-600" />
              <span className="text-sm text-stone-800">
                Jag har läst <Link href="/integritet" className="text-olive-700 underline">integritetspolicyn</Link>. *
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-1 accent-olive-600" />
              <span className="text-sm text-stone-800">
                Skicka veckans bästa vittnesbörd till min e-post (frivilligt).
              </span>
            </label>
          </div>
        )}
      </div>

      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm">{err}</div>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-4 py-2 text-sm text-stone-700 hover:text-stone-900"
            disabled={busy}
          >
            ← Tillbaka
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-stone-500 hover:text-stone-800 underline"
            disabled={busy}
          >
            Hoppa över allt
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={busy}
          className="px-5 py-2 rounded bg-olive-600 text-parchment font-medium hover:bg-olive-700 disabled:opacity-50"
        >
          {busy ? "Sparar…" : step === 4 ? "Slutför" : "Nästa →"}
        </button>
      </div>
    </div>
  );
}
