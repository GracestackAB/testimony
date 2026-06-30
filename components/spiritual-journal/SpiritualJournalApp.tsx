"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORY_ORDER, dailyPrompt } from "@/lib/spiritual-journal/categories";
import type { SpiritualJournalCategory, SpiritualJournalEntry } from "@/lib/spiritual-journal/types";
import { useDict, useLocale } from "@/lib/i18n/client";
import { formatLocaleDate } from "@/lib/i18n/format";

type Props = {
  initialCategory?: SpiritualJournalCategory;
  initialCounts: Record<string, number>;
};

export function SpiritualJournalApp({ initialCategory = "gratitude", initialCounts }: Props) {
  const dict = useDict();
  const { locale } = useLocale();
  const t = dict.spiritualJournal;
  const c = dict.common;

  const [category, setCategory] = useState<SpiritualJournalCategory>(initialCategory);
  const [entries, setEntries] = useState<SpiritualJournalEntry[]>([]);
  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const catMeta = CATEGORY_ORDER.find((x) => x.id === category)!;
  const catLabels = t.categories[category];
  const prompt = useMemo(() => dailyPrompt(category, locale), [category, locale]);

  const loadEntries = useCallback(async (cat: SpiritualJournalCategory) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spiritual-journal?category=${cat}`);
      if (!res.ok) throw new Error(c.error);
      const data = (await res.json()) as { entries: SpiritualJournalEntry[] };
      setEntries(data.entries);
    } catch {
      setError(c.error);
    } finally {
      setLoading(false);
    }
  }, [c.error]);

  useEffect(() => {
    void loadEntries(category);
  }, [category, loadEntries]);

  function resetForm() {
    setBody("");
    setTitle("");
    setScriptureRef("");
    setIsPinned(false);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        category,
        body: body.trim(),
        title: title.trim() || null,
        scripture_ref: scriptureRef.trim() || null,
        is_pinned: isPinned,
      };

      const res = editingId
        ? await fetch(`/api/spiritual-journal/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/spiritual-journal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) throw new Error(c.error);

      resetForm();
      await loadEntries(category);
      if (!editingId) {
        setCounts((prev) => ({ ...prev, [category]: (prev[category] ?? 0) + 1 }));
      }
    } catch {
      setError(c.error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/spiritual-journal/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(c.error);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setCounts((prev) => ({ ...prev, [category]: Math.max(0, (prev[category] ?? 1) - 1) }));
    if (editingId === id) resetForm();
  }

  function startEdit(entry: SpiritualJournalEntry) {
    setEditingId(entry.id);
    setBody(entry.body);
    setTitle(entry.title ?? "");
    setScriptureRef(entry.scripture_ref ?? "");
    setIsPinned(entry.is_pinned);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-olive-200 bg-olive-50/80 px-4 py-3 text-sm text-stone-700">
        <p className="font-medium text-stone-900">{t.privacyBanner}</p>
        <p className="mt-1 text-stone-600">{t.privacyDetail}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CATEGORY_ORDER.map((item) => {
          const active = item.id === category;
          const label = t.categories[item.id].label;
          const count = counts[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCategory(item.id);
                resetForm();
              }}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                active
                  ? "border-olive-400 bg-olive-50 shadow-sm"
                  : "border-stone-200 bg-parchment hover:bg-stone-50"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              <span className="mt-1 block text-sm font-medium text-stone-900">{label}</span>
              {count > 0 && (
                <span className="text-[11px] text-stone-500">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-stone-200 bg-parchment p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl" aria-hidden>
            {catMeta.icon}
          </span>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-stone-900">{catLabels.label}</h2>
            <p className="text-sm text-stone-600 mt-1">{catLabels.desc}</p>
          </div>
        </div>

        <div className="mb-5 rounded-lg bg-stone-100/80 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-olive-700 font-semibold mb-1">
            {t.todayPrompt}
          </p>
          <p className="font-serif text-stone-800 italic">{prompt}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-medium text-stone-800">
            {editingId ? c.edit : t.newEntry}
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titleOptional}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          {(category === "scripture" || category === "promise") && (
            <input
              type="text"
              value={scriptureRef}
              onChange={(e) => setScriptureRef(e.target.value)}
              placeholder={t.scriptureOptional}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.writePlaceholder}
            rows={5}
            required
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm resize-y min-h-[120px]"
          />
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-stone-300"
            />
            {t.pinEntry}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || !body.trim()}
              className="rounded-lg bg-olive-700 px-4 py-2 text-sm font-medium text-white hover:bg-olive-800 disabled:opacity-50"
            >
              {saving ? c.saving : t.saveEntry}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                {c.cancel}
              </button>
            )}
          </div>
        </form>
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section>
        <h3 className="font-serif text-xl font-semibold text-stone-900 mb-3">{catLabels.label}</h3>
        {loading ? (
          <p className="text-stone-500 text-sm">{c.loading}</p>
        ) : entries.length === 0 ? (
          <p className="text-stone-500 text-sm italic">{t.empty}</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide">
                      {formatLocaleDate(entry.entry_date, locale)}
                      {entry.is_pinned && " · 📌"}
                    </p>
                    {entry.title && (
                      <p className="font-medium text-stone-900 mt-0.5">{entry.title}</p>
                    )}
                    {entry.scripture_ref && (
                      <p className="text-sm text-olive-700 font-serif mt-0.5">{entry.scripture_ref}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1"
                    >
                      {c.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry.id)}
                      className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                    >
                      {c.delete}
                    </button>
                  </div>
                </div>
                <p className="text-stone-700 text-sm whitespace-pre-wrap">{entry.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">{t.sharePublicCta}</p>
        <p className="mt-1">{t.sharePublicHint}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/tack" className="text-olive-700 underline">
            {dict.nav.gratitude} →
          </Link>
          <Link href="/boneamnen" className="text-olive-700 underline">
            {dict.nav.prayerRequests} →
          </Link>
          <Link href="/bonesvar" className="text-olive-700 underline">
            {dict.nav.prayerAnswers} →
          </Link>
        </div>
      </aside>
    </div>
  );
}
