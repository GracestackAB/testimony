import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("testimonies").select("title, lede").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return { title: "Vittnesbörd" };
  return { title: data.title, description: data.lede || undefined };
}

function formatEmbed(url: string): string {
  // YouTube watch -> embed
  const ytWatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
  const ytShort = url.match(/youtu\.be\/([^?]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  return url;
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("testimonies")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!t) notFound();

  const [{ data: orgs }, { data: inspiredBy }, { data: inspiredChildren }] = await Promise.all([
    supabase
      .from("content_organizations")
      .select("organizations(slug, name)")
      .eq("content_kind", "testimony")
      .eq("content_id", t.id),
    t.inspired_by_testimony_id
      ? supabase
          .from("testimonies")
          .select("id, slug, title, lede")
          .eq("id", t.inspired_by_testimony_id)
          .eq("status", "published")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("testimonies")
      .select("id, slug, title, lede")
      .eq("inspired_by_testimony_id", t.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <article className="max-w-3xl mx-auto px-5 py-14">
      <div className="text-center mb-10">
        <div className="text-xs text-stone-500 uppercase tracking-widest mb-3">
          {t.format === "musik" ? "Musikvittnesbörd" : t.format === "video" ? "Videovittnesbörd" : t.format === "bildberattelse" ? "Bildberättelse" : "Vittnesbörd"}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900 leading-tight">{t.title}</h1>
        {t.lede && <p className="mt-5 font-serif text-xl text-stone-600 italic max-w-2xl mx-auto">{t.lede}</p>}
        <div className="mt-4 text-xs text-stone-500">
          {t.published_at && new Date(t.published_at).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}
          {t.reading_minutes ? ` · ${t.reading_minutes} min läsning` : ""}
        </div>
      </div>

      {t.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.cover_image_url} alt="" className="w-full rounded mb-10 object-cover max-h-[500px]" />
      )}

      {t.media_embed_url && (
        <div className="aspect-video mb-10">
          <iframe
            src={formatEmbed(t.media_embed_url)}
            className="w-full h-full rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {t.body?.trim() && (
        <div className="prose mx-auto">
          {t.body.split("\n\n").map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {/* Inspirerad av */}
      {inspiredBy && (
        <div className="mt-10 pt-6 border-t border-stone-200">
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-2">Inspirerat av</div>
          <Link href={`/vittnesbord/${inspiredBy.slug}`} className="block bg-olive-50 border-l-4 border-olive-500 rounded-r px-5 py-4 hover:bg-olive-100 transition-colors">
            <div className="font-serif text-lg text-stone-900 mb-1">{inspiredBy.title}</div>
            {inspiredBy.lede && <div className="text-sm text-stone-600 italic line-clamp-2">{inspiredBy.lede}</div>}
          </Link>
        </div>
      )}

      {/* Dela / Fortsätt kedjan */}
      <div className="mt-10 pt-8 border-t border-stone-200 bg-gradient-to-br from-olive-50/50 to-parchment rounded-xl p-6 -mx-2">
        <h3 className="font-serif text-xl font-semibold text-stone-900 mb-2">
          Rörde detta dig?
        </h3>
        <p className="text-stone-600 mb-4 text-sm">
          Kedja vidare — dela länken med någon som behöver höra det, eller skriv ditt eget vittnesbörd inspirerat av detta.
        </p>
        <div className="flex flex-wrap gap-3">
          <ShareButton
            title={t.title}
            text={t.lede || `Läs ${t.title} på testimony.se`}
            label="Dela vittnesbördet"
            variant="primary"
          />
          <Link
            href={`/skriv?inspired_by=${t.id}#vittnesbord`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-300 text-stone-800 hover:border-olive-500 text-sm transition-colors"
          >
            <span>✍️</span> Skriv mitt eget vittnesbörd
          </Link>
        </div>
      </div>

      {/* Har inspirerat */}
      {inspiredChildren && inspiredChildren.length > 0 && (
        <div className="mt-10 pt-8 border-t border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-stone-500">Detta vittnesbörd har inspirerat</div>
            <Link href={`/kedja/${t.slug}`} className="text-xs text-olive-700 hover:text-olive-900 underline">
              Se hela kedjan →
            </Link>
          </div>
          <ul className="space-y-3">
            {inspiredChildren.map((c: any) => (
              <li key={c.id}>
                <Link href={`/vittnesbord/${c.slug}`} className="block border-l-2 border-olive-300 pl-4 py-1 hover:border-olive-600 transition-colors">
                  <div className="font-serif text-base text-stone-900">{c.title}</div>
                  {c.lede && <div className="text-sm text-stone-600 line-clamp-1">{c.lede}</div>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Även om ingen barnkedja - om det är en del av en kedja (har parent), visa länk */}
      {inspiredBy && (!inspiredChildren || inspiredChildren.length === 0) && (
        <div className="mt-8 text-center">
          <Link href={`/kedja/${t.slug}`} className="inline-flex items-center gap-1 text-sm text-olive-700 hover:text-olive-900 underline">
            Se hela kedjan detta vittnesbörd tillhör →
          </Link>
        </div>
      )}

      {orgs && orgs.length > 0 && (
        <div className="mt-10 pt-6 border-t border-stone-200 text-sm text-stone-600">
          Taggad verksamhet:{" "}
          {orgs.map((o: any, i: number) => (
            <span key={i}>
              {i > 0 && ", "}
              <Link href={`/plats/${o.organizations?.slug}`} className="text-olive-700 hover:underline">
                {o.organizations?.name}
              </Link>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
