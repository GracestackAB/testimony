"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SONG_TYPES } from "@/lib/worship/types";

export function NewWorshipSongForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [songType, setSongType] = useState("lovsang");
  const [youtube, setYoutube] = useState("");
  const [spotify, setSpotify] = useState("");
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [bibleRefs, setBibleRefs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/worship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artist: artist.trim() || undefined,
          song_type: songType,
          youtube_url: youtube.trim() || undefined,
          spotify_url: spotify.trim() || undefined,
          description: description.trim() || undefined,
          lyrics: lyrics.trim() || undefined,
          bible_refs: bibleRefs
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.song) {
        setError(j.error ?? "Kunde inte skicka sången.");
        return;
      }
      if (j.song.status === "published") {
        router.push(`/lovsang/${j.song.slug}`);
      } else {
        router.push(`/lovsang?inskickad=1`);
      }
    } catch {
      setError("Nätverksfel.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-parchment border border-stone-200 rounded-lg p-5">
      <div>
        <label className="block text-sm font-medium text-stone-800 mb-1">Titel *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Stor är vår Gud"
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1">Artist / kompositör</label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            maxLength={150}
            placeholder="Hillsong / Chris Tomlin / okänd"
            className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1">Typ</label>
          <select
            value={songType}
            onChange={(e) => setSongType(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
          >
            {SONG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1">YouTube-länk</label>
          <input
            type="url"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-800 mb-1">Spotify-länk</label>
          <input
            type="url"
            value={spotify}
            onChange={(e) => setSpotify(e.target.value)}
            placeholder="https://open.spotify.com/track/…"
            className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-800 mb-1">Bibelreferenser (kommaseparerat)</label>
        <input
          type="text"
          value={bibleRefs}
          onChange={(e) => setBibleRefs(e.target.value)}
          placeholder="Psalm 95:1, Hebreerbrevet 13:15"
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-800 mb-1">Beskrivning</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Vad betyder sången för dig? När hörde du den?"
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-800 mb-1">Sångtext (frivilligt)</label>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={6}
          placeholder="Skriv ut texten om du har upphovsrätt eller om sången är public domain (psalmer)"
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500"
        />
        <p className="text-xs text-stone-500 mt-1">Tänk på upphovsrätt — länka hellre om du är osäker.</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-5 py-2 rounded-full bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Skickar…" : "Skicka för granskning"}
        </button>
      </div>
    </form>
  );
}
