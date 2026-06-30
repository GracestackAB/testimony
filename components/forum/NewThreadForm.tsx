"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; slug: string; name: string; icon: string | null };

type Props = {
  categories: Category[];
  initialCategoryId: string;
};

export function NewThreadForm({ categories, initialCategoryId }: Props) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId, title, body }),
      });
      const j = await res.json();
      if (!res.ok || !j.thread) {
        setError(j.error ?? "Kunde inte skapa tråden.");
        return;
      }
      router.push(`/forum/t/${j.thread.slug}`);
    } catch {
      setError("Nätverksfel.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-parchment border border-stone-200 rounded-lg p-5">
      <div>
        <label className="block text-sm font-medium text-stone-800 mb-1">Kategori *</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        >
          {categories.length === 0 && <option value="">(inga kategorier)</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-800 mb-1">Titel *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          placeholder="Vad vill du fråga eller dela?"
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-800 mb-1">Inlägg *</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={8}
          maxLength={10000}
          placeholder="Berätta mer…"
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        />
        <p className="text-xs text-stone-500 mt-1">{body.length}/10 000 tecken</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim() || !categoryId}
          className="px-5 py-2 rounded-full bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Skapar…" : "Publicera"}
        </button>
      </div>
    </form>
  );
}
