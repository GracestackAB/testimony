export type SongType = "psalm" | "sang" | "lovsang" | "eget" | "annat";

export const SONG_TYPES: { value: SongType; label: string }[] = [
  { value: "lovsang", label: "Lovsång" },
  { value: "psalm", label: "Psalm" },
  { value: "sang", label: "Sång" },
  { value: "eget", label: "Eget verk" },
  { value: "annat", label: "Annat" },
];

export type WorshipSong = {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  song_type: SongType;
  youtube_url: string | null;
  spotify_url: string | null;
  lyrics: string | null;
  bible_refs: string[] | null;
  description: string | null;
  author_id: string | null;
  status: "draft" | "pending" | "published" | "rejected" | "archived";
  published_at: string | null;
  created_at: string;
};

export function youtubeIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const pathParts = u.pathname.split("/");
      if (pathParts.includes("embed")) return pathParts[pathParts.indexOf("embed") + 1] ?? null;
      if (pathParts.includes("shorts")) return pathParts[pathParts.indexOf("shorts") + 1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}
