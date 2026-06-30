"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NOTIFICATION_TYPES, type NotificationPreference, type NotificationType } from "@/lib/notifications/types";

type PrefsMap = Partial<Record<NotificationType, NotificationPreference>>;

const DEFAULTS: { in_app: boolean; push: boolean; email: boolean } = {
  in_app: true,
  push: false,
  email: false,
};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationSettings({
  initialPrefs,
  vapidPublicKey,
  isModerator = false,
}: {
  initialPrefs: PrefsMap;
  vapidPublicKey: string | null;
  isModerator?: boolean;
}) {
  const [prefs, setPrefs] = useState<PrefsMap>(initialPrefs);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);
    if (!supported) return;
    setPushPermission(Notification.permission);
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    });
  }, []);

  function getPref(type: NotificationType) {
    return prefs[type] ?? { ...DEFAULTS, user_id: "", type };
  }

  async function updatePref(type: NotificationType, patch: Partial<typeof DEFAULTS>) {
    const current = getPref(type);
    const next = { ...current, ...patch };
    setPrefs((p) => ({ ...p, [type]: next as NotificationPreference }));
    await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...patch }),
    });
  }

  async function enablePush() {
    setPushError(null);
    if (!vapidPublicKey) {
      setPushError("Push är inte konfigurerat på servern.");
      return;
    }
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        setPushError("Du måste tillåta notiser i webbläsaren.");
        return;
      }
      const key = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      });
      const res = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("server_rejected");
      setPushSubscribed(true);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Något gick fel.");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <Link href="/konto" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
        ← Tillbaka
      </Link>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Notiser</h1>
      <p className="text-sm text-stone-700 mb-8">
        Välj hur du vill få notiser. Du kan ändra detta när som helst.
      </p>

      {/* Push channel toggle */}
      <section className="mb-8 p-5 border border-stone-200 rounded-lg bg-parchment">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-2">
          Push-notiser till den här enheten
        </h2>
        <p className="text-sm text-stone-700 mb-4">
          Få notiser direkt på telefonen eller datorn — även när webbläsaren är stängd.
        </p>
        {!pushSupported ? (
          <p className="text-sm text-stone-500">
            Den här webbläsaren stöder inte push-notiser. På iPhone: lägg till sajten på hemskärmen
            och öppna därifrån (kräver iOS 16.4+).
          </p>
        ) : pushSubscribed ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-olive-700 font-medium">✓ Push aktiverat på den här enheten</span>
            <button
              type="button"
              onClick={disablePush}
              disabled={pushBusy}
              className="text-sm text-stone-600 hover:text-stone-900 underline disabled:opacity-50"
            >
              Stäng av
            </button>
          </div>
        ) : pushPermission === "denied" ? (
          <p className="text-sm text-red-700">
            Du har blockerat notiser för testimony.se i webbläsaren. Aktivera dem i webbläsarens
            inställningar för den här sajten och ladda om sidan.
          </p>
        ) : (
          <button
            type="button"
            onClick={enablePush}
            disabled={pushBusy}
            className="px-4 py-2 rounded bg-olive-600 text-parchment font-medium hover:bg-olive-700 disabled:opacity-50"
          >
            {pushBusy ? "Aktiverar…" : "Aktivera push på den här enheten"}
          </button>
        )}
        {pushError && (
          <p className="text-sm text-red-700 mt-3 bg-red-50 border border-red-200 rounded p-2">
            {pushError}
          </p>
        )}
      </section>

      {/* Per-type preferences */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          Vilka notiser vill du få?
        </h2>
        <div className="border border-stone-200 rounded-lg overflow-hidden bg-parchment">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-stone-50 border-b border-stone-200 text-[11px] uppercase tracking-wide text-stone-500 font-semibold">
            <div>Typ</div>
            <div className="w-12 text-center">App</div>
            <div className="w-12 text-center">Push</div>
            <div className="w-12 text-center">E-post</div>
          </div>
          {NOTIFICATION_TYPES.filter((t) => {
            if (t.value === "mod_queue_pending" || t.value === "daily_bible_pending") {
              return isModerator;
            }
            return true;
          }).map((t) => {
            const p = getPref(t.value);
            return (
              <div
                key={t.value}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center border-b border-stone-100 last:border-0"
              >
                <div className="min-w-0">
                  <div className="font-medium text-stone-900 text-sm">{t.label}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{t.description}</div>
                </div>
                <Toggle
                  checked={p.in_app}
                  onChange={(v) => updatePref(t.value, { in_app: v })}
                  ariaLabel={`${t.label}: app-notiser`}
                />
                <Toggle
                  checked={p.push}
                  onChange={(v) => updatePref(t.value, { push: v })}
                  ariaLabel={`${t.label}: push-notiser`}
                  disabled={!pushSubscribed}
                />
                <Toggle
                  checked={p.email}
                  onChange={(v) => updatePref(t.value, { email: v })}
                  ariaLabel={`${t.label}: e-postnotiser`}
                />
              </div>
            );
          })}
        </div>
        {!pushSubscribed && (
          <p className="text-xs text-stone-500 mt-2">
            Push-kolumnen är inaktiv tills du aktiverat push på den här enheten ovan.
          </p>
        )}
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        disabled ? "bg-stone-200 opacity-50 cursor-not-allowed" : checked ? "bg-olive-600" : "bg-stone-300"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
