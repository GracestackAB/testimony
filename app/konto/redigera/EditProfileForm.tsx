"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { UsernameInput } from "@/components/profile/UsernameInput";
import { DenominationConsent } from "@/components/profile/DenominationConsent";
import { DENOMINATIONS, ROLES_IN_CHURCH } from "@/lib/profile/constants";
import type { Profile } from "@/lib/profile/types";

export function EditProfileForm({ profile: initial }: { profile: Profile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [hasConsent, setHasConsent] = useState(initial.consent_special_category_at !== null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [firstName, setFirstName] = useState(initial.first_name ?? "");
  const [lastName, setLastName] = useState(initial.last_name ?? "");
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [username, setUsername] = useState(initial.username ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [church, setChurch] = useState(initial.church ?? "");
  const [denomination, setDenomination] = useState(initial.denomination ?? "");
  const [role, setRole] = useState(initial.role_in_church ?? "");
  const [believerSince, setBelieverSince] = useState(initial.believer_since ?? "");
  const [favoriteVerse, setFavoriteVerse] = useState(initial.favorite_verse ?? "");
  const [headline, setHeadline] = useState(initial.headline ?? "");
  const [ministryFocus, setMinistryFocus] = useState(initial.ministry_focus ?? "");
  const [openToConnect, setOpenToConnect] = useState(initial.open_to_connect ?? false);
  const [openToServe, setOpenToServe] = useState(initial.open_to_serve ?? false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      const payload: Record<string, unknown> = {
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: displayName || null,
        bio: bio || null,
        city: city || null,
        church: church || null,
        headline: headline || null,
        ministry_focus: ministryFocus || null,
        open_to_connect: openToConnect,
        open_to_serve: openToServe,
      };
      if (username && username !== initial.username) {
        payload.username = username;
      }
      if (hasConsent) {
        payload.denomination = denomination || null;
        payload.role_in_church = role || null;
        payload.believer_since = believerSince || null;
        payload.favorite_verse = favoriteVerse || null;
      }

      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error ?? "Kunde inte spara.");
        return;
      }
      setProfile((p) => ({ ...p, ...json } as Profile));
      setOk(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <Link href="/konto" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">← Tillbaka</Link>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Redigera profil</h1>
      <p className="text-sm text-stone-700 mb-6">
        Allt utom förnamn är frivilligt.{" "}
        <Link href="/konto/integritet" className="text-olive-700 underline">Hantera synlighet och samtycke →</Link>
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <AvatarUpload
          currentUrl={profile.avatar_url}
          name={profile.display_name}
          onUploaded={(url) => setProfile((p) => ({ ...p, avatar_url: url }))}
          onDeleted={() => setProfile((p) => ({ ...p, avatar_url: null }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Förnamn</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" maxLength={80} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Efternamn</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" maxLength={80} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1.5">Visningsnamn</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Hur du visas på sajten"
            className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" maxLength={120} />
        </div>

        <UsernameInput value={username} onChange={setUsername} initialUsername={profile.username} />

        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1.5">Rubrik (LinkedIn-stil)</label>
          <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
            placeholder="t.ex. Ungdomsledare · Passion för bön och evangelisation"
            className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" maxLength={120} />
          <p className="text-xs text-stone-500 mt-1">{headline.length}/120</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1.5">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 240))} rows={3}
            className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" />
          <p className="text-xs text-stone-500 mt-1">{bio.length}/240</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1.5">Stad</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80}
            className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1.5">Församling</label>
          <input type="text" value={church} onChange={(e) => setChurch(e.target.value)} maxLength={160}
            className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1.5">Tjänst & fokus</label>
          <input type="text" value={ministryFocus} onChange={(e) => setMinistryFocus(e.target.value.slice(0, 200))}
            placeholder="Vad brinner du för i Guds rike?"
            className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" maxLength={200} />
        </div>

        <div className="space-y-2 p-4 border border-stone-200 rounded-lg bg-stone-50">
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input type="checkbox" checked={openToConnect} onChange={(e) => setOpenToConnect(e.target.checked)} />
            Öppen för kontakt (visa i nätverket)
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input type="checkbox" checked={openToServe} onChange={(e) => setOpenToServe(e.target.checked)} />
            Öppen för tjänst / volontär
          </label>
        </div>

        <DenominationConsent initialGranted={hasConsent} onChange={setHasConsent} />

        <fieldset disabled={!hasConsent} className="space-y-4 disabled:opacity-50">
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Samfund</label>
            <select value={denomination} onChange={(e) => setDenomination(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500">
              <option value="">— välj —</option>
              {DENOMINATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Roll i församlingen</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500">
              <option value="">— välj —</option>
              {ROLES_IN_CHURCH.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Frälsningsdag</label>
            <input type="date" value={believerSince} onChange={(e) => setBelieverSince(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Favoritbibelvers</label>
            <input type="text" value={favoriteVerse} onChange={(e) => setFavoriteVerse(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded bg-parchment focus:outline-none focus:border-olive-500" maxLength={240} />
          </div>
        </fieldset>

        {err && <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm">{err}</div>}
        {ok && <div className="p-3 bg-olive-50 border border-olive-200 text-olive-900 rounded text-sm">Sparat ✓</div>}

        <div className="flex justify-end">
          <button type="submit" disabled={busy}
            className="px-5 py-2 rounded bg-olive-600 text-parchment font-medium hover:bg-olive-700 disabled:opacity-50">
            {busy ? "Sparar…" : "Spara ändringar"}
          </button>
        </div>
      </form>
    </div>
  );
}
