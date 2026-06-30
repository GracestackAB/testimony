/**
 * Hämtar senaste videorna från en YouTube-kanal via officiella RSS-flödet.
 * Ingen API-nyckel krävs. Rate limits är praktiskt taget icke-existerande.
 */

export type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  embedUrl: string;
  thumbnailUrl: string;
  publishedAt: string;
};

/**
 * Extraherar channel ID från olika format användare kan klistra in:
 * - UC...                              (rent channel_id)
 * - https://youtube.com/channel/UC...
 * - https://youtube.com/@handle        (kräver extra steg - returnerar handle)
 * - https://youtube.com/playlist?list=PL...  (playlist - använder feed för playlist)
 */
export function normalizeYouTubeInput(input: string): { type: "channel" | "playlist" | "handle" | "unknown"; value: string } {
  const s = input.trim();
  if (!s) return { type: "unknown", value: "" };

  // Raw channel ID (UC...)
  if (/^UC[A-Za-z0-9_-]{20,}$/.test(s)) return { type: "channel", value: s };
  // Raw playlist ID (PL...)
  if (/^PL[A-Za-z0-9_-]{10,}$/.test(s)) return { type: "playlist", value: s };

  // channel URL
  const chMatch = s.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)/);
  if (chMatch) return { type: "channel", value: chMatch[1] };

  // playlist URL
  const plMatch = s.match(/[?&]list=(PL[A-Za-z0-9_-]+)/);
  if (plMatch) return { type: "playlist", value: plMatch[1] };

  // handle URL
  const hMatch = s.match(/youtube\.com\/@([A-Za-z0-9._-]+)/);
  if (hMatch) return { type: "handle", value: hMatch[1] };

  return { type: "unknown", value: s };
}

function feedUrlFor(input: string): string | null {
  const n = normalizeYouTubeInput(input);
  if (n.type === "channel") return `https://www.youtube.com/feeds/videos.xml?channel_id=${n.value}`;
  if (n.type === "playlist") return `https://www.youtube.com/feeds/videos.xml?playlist_id=${n.value}`;
  return null;
}

/**
 * Hämtar de senaste videorna (default 5) från en YouTube-kanal eller playlist.
 * Cachas 30 min av Next fetch cache.
 */
export async function fetchLatestVideos(channelInput: string, limit = 5): Promise<YouTubeVideo[]> {
  const url = feedUrlFor(channelInput);
  if (!url) return [];

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, limit);
  } catch {
    return [];
  }
}

function parseFeed(xml: string, limit: number): YouTubeVideo[] {
  // Enkelt regex-baserat parsing — inget JSX/DOM behövs i edge/server.
  const entries = xml.split("<entry>").slice(1, limit + 1);
  return entries
    .map(e => {
      const idMatch = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = e.match(/<title>([^<]+)<\/title>/);
      const pubMatch = e.match(/<published>([^<]+)<\/published>/);
      const thumbMatch = e.match(/<media:thumbnail[^>]*url="([^"]+)"/);
      if (!idMatch) return null;
      const id = idMatch[1];
      return {
        id,
        title: decodeXml(titleMatch?.[1] || ""),
        url: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        thumbnailUrl: thumbMatch?.[1] || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: pubMatch?.[1] || "",
      } satisfies YouTubeVideo;
    })
    .filter(Boolean) as YouTubeVideo[];
}

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
