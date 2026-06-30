"use client";
import { useEffect, useRef, useState } from "react";

/**
 * DraftSaver — placera INUTI ett <form> element. Autosparar alla fält
 * till localStorage under `draft:<formKey>` var ~1.5s. Vid mount erbjuder
 * den en återställning om utkast finns.
 *
 * Props:
 *  - formKey: unik nyckel per formulär (t.ex. "testimony", "prayer_request")
 *  - clearOnSubmit: rensar utkast när formen submittas (default: true)
 *  - label: användarvänligt namn för banner ("vittnesbörd", "böneämne")
 */

type SavedDraft = {
  values: Record<string, string>;
  savedAt: number;
};

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 dagar

function storageKey(formKey: string) {
  return `draft:${formKey}`;
}

function minutesAgo(t: number): string {
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "för mindre än en minut sedan";
  if (diff < 3600) return `för ${Math.floor(diff / 60)} min sedan`;
  if (diff < 86400) return `för ${Math.floor(diff / 3600)} timmar sedan`;
  return `för ${Math.floor(diff / 86400)} dagar sedan`;
}

function getForm(el: HTMLElement | null): HTMLFormElement | null {
  let cur: HTMLElement | null = el;
  while (cur && cur.tagName !== "FORM") cur = cur.parentElement;
  return cur as HTMLFormElement | null;
}

function collectValues(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  const elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!el.name) continue;
    if (el.type === "submit" || el.type === "button" || el.type === "file" || el.type === "password") continue;
    if (el.type === "checkbox" || el.type === "radio") {
      out[el.name] = (el as HTMLInputElement).checked ? "on" : "";
    } else {
      out[el.name] = el.value;
    }
  }
  return out;
}

function applyValues(form: HTMLFormElement, values: Record<string, string>) {
  const elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!el.name || !(el.name in values)) continue;
    if (el.type === "checkbox" || el.type === "radio") {
      (el as HTMLInputElement).checked = values[el.name] === "on";
    } else {
      el.value = values[el.name];
    }
  }
}

export function DraftSaver({
  formKey,
  label = "utkast",
  clearOnSubmit = true,
}: {
  formKey: string;
  label?: string;
  clearOnSubmit?: boolean;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [restoreAvailable, setRestoreAvailable] = useState<SavedDraft | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // Mount: check for saved draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey(formKey));
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedDraft;
      if (!parsed?.values || !parsed?.savedAt) return;
      if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
        localStorage.removeItem(storageKey(formKey));
        return;
      }
      // Only show banner if at least one field has content
      const hasContent = Object.values(parsed.values).some((v) => v && v.trim() !== "" && v !== "on");
      if (!hasContent) return;
      setRestoreAvailable(parsed);
    } catch {
      // ignore
    }
  }, [formKey]);

  // Attach input listener + form submit listener
  useEffect(() => {
    const form = getForm(anchorRef.current);
    if (!form) return;

    const scheduleSave = () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        try {
          const values = collectValues(form);
          const hasContent = Object.values(values).some((v) => v && v.trim() !== "" && v !== "on");
          if (!hasContent) {
            localStorage.removeItem(storageKey(formKey));
            setJustSaved(null);
            return;
          }
          const payload: SavedDraft = { values, savedAt: Date.now() };
          localStorage.setItem(storageKey(formKey), JSON.stringify(payload));
          setJustSaved(payload.savedAt);
        } catch {
          // quota exceeded, incognito, etc
        }
      }, 1500);
    };

    const onSubmit = () => {
      if (clearOnSubmit) {
        try {
          localStorage.removeItem(storageKey(formKey));
        } catch {
          // ignore
        }
      }
    };

    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);
    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("input", scheduleSave);
      form.removeEventListener("change", scheduleSave);
      form.removeEventListener("submit", onSubmit);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [formKey, clearOnSubmit]);

  function restore() {
    const form = getForm(anchorRef.current);
    if (!form || !restoreAvailable) return;
    applyValues(form, restoreAvailable.values);
    setRestored(true);
    setRestoreAvailable(null);
    setDismissed(true);
  }

  function discard() {
    try {
      localStorage.removeItem(storageKey(formKey));
    } catch {
      // ignore
    }
    setRestoreAvailable(null);
    setDismissed(true);
  }

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {restoreAvailable && !dismissed && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-3 text-sm">
          <span aria-hidden="true" className="text-xl leading-none mt-0.5">📝</span>
          <div className="flex-1">
            <p className="font-medium text-amber-900">
              Du har ett osparat {label} från {minutesAgo(restoreAvailable.savedAt)}.
            </p>
            <p className="text-amber-800 mt-0.5 text-xs">
              Vill du återställa det eller börja om från början?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={restore}
                className="px-3 py-1.5 rounded bg-amber-700 text-white text-xs font-medium hover:bg-amber-800"
              >
                Återställ utkast
              </button>
              <button
                type="button"
                onClick={discard}
                className="px-3 py-1.5 rounded bg-white border border-amber-300 text-amber-900 text-xs font-medium hover:bg-amber-100"
              >
                Släng
              </button>
            </div>
          </div>
        </div>
      )}
      {(justSaved || restored) && (
        <p className="mb-3 text-xs text-stone-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-olive-500" aria-hidden="true" />
          {restored ? "Utkast återställt." : "Utkast sparat lokalt."}
        </p>
      )}
    </>
  );
}
