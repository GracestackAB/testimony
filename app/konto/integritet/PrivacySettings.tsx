"use client";
import { useState } from "react";
import Link from "next/link";
import { FieldVisibilityPicker } from "@/components/profile/FieldVisibilityPicker";
import { DenominationConsent } from "@/components/profile/DenominationConsent";
import { PROFILE_VISIBILITY, type FieldVisibility, type FieldVisibilityKey, type ProfileVisibility } from "@/lib/profile/constants";
import type { Profile } from "@/lib/profile/types";

export function PrivacySettings({ profile: initial }: { profile: Profile }) {
  const [profile, setProfile] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function setProfileVisibility(v: ProfileVisibility) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/profile/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_visibility: v }),
      });
      if (!res.ok) {
        setErr("Kunde inte uppdatera.");
        return;
      }
      setProfile((p) => ({ ...p, profile_visibility: v }));
      setOk(true);
    } finally {
      setBusy(false);
    }
  }

  async function setFieldVisibility(key: FieldVisibilityKey, val: FieldVisibility) {
    const nextField = { ...profile.field_visibility, [key]: val };
    setProfile((p) => ({ ...p, field_visibility: nextField }));
    await fetch("/api/profile/visibility", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_visibility: { [key]: val } }),
    });
    setOk(true);
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <Link href="/konto" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">← Tillbaka</Link>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Synlighet & samtycke</h1>
      <p className="text-sm text-stone-700 mb-8">
        Du bestämmer vem som får se vad. Du kan ändra detta när som helst.
      </p>

      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">Min profil syns för</h2>
        <div className="space-y-2">
          {PROFILE_VISIBILITY.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-colors ${
                profile.profile_visibility === opt.value
                  ? "border-olive-600 bg-olive-50"
                  : "border-stone-200 bg-parchment hover:bg-stone-50"
              }`}
            >
              <input
                type="radio"
                name="profile_visibility"
                checked={profile.profile_visibility === opt.value}
                onChange={() => setProfileVisibility(opt.value)}
                disabled={busy}
                className="mt-1 accent-olive-600"
              />
              <div>
                <div className="font-medium text-stone-900">{opt.label}</div>
                <div className="text-sm text-stone-600">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">Synlighet per fält</h2>
        <div className="border border-stone-200 rounded p-4 bg-parchment">
          <FieldVisibilityPicker value={profile.field_visibility} onChange={setFieldVisibility} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">Samtycke för religiösa uppgifter</h2>
        <DenominationConsent
          initialGranted={profile.consent_special_category_at !== null}
          onChange={(g) => {
            setProfile((p) => ({
              ...p,
              consent_special_category_at: g ? new Date().toISOString() : null,
              denomination: g ? p.denomination : null,
              role_in_church: g ? p.role_in_church : null,
              believer_since: g ? p.believer_since : null,
              favorite_verse: g ? p.favorite_verse : null,
            }));
          }}
        />
        {profile.consent_special_category_at && (
          <p className="text-xs text-stone-500 mt-2">
            Samtycke givet {new Date(profile.consent_special_category_at).toLocaleString("sv-SE")}
          </p>
        )}
      </section>

      {ok && <div className="p-3 bg-olive-50 border border-olive-200 text-olive-900 rounded text-sm">Sparat ✓</div>}
      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm">{err}</div>}
    </div>
  );
}
