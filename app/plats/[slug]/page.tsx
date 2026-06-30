import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedCard } from "@/components/FeedCard";
import { ShareButton } from "@/components/ShareButton";
import { fetchLatestVideos } from "@/lib/youtube";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("name, description").eq("slug", slug).maybeSingle();
  return { title: data?.name || "Verksamhet", description: data?.description || undefined };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!org) notFound();

  const [testRes, volRes, reqRes] = await Promise.all([
    supabase
      .from("content_organizations")
      .select("content_id, testimonies:content_id(id, slug, title, lede, format, cover_image_url, published_at, status, chain_size)")
      .eq("content_kind", "testimony")
      .eq("organization_id", org.id),
    supabase
      .from("volunteer_opportunities")
      .select("id, slug, title, category, commitment, status")
      .eq("organization_id", org.id)
      .eq("status", "open"),
    supabase
      .from("content_organizations")
      .select("content_id, prayer_requests:content_id(id, title, body, status, is_answered)")
      .eq("content_kind", "prayer_request")
      .eq("organization_id", org.id),
  ]);

  const testimonies = (testRes.data || [])
    .map((x: any) => x.testimonies)
    .filter((t: any) => t && t.status === "published");
  const volunteers = volRes.data || [];
  const prayers = (reqRes.data || [])
    .map((x: any) => x.prayer_requests)
    .filter((p: any) => p && p.status === "published" && !p.is_answered);

  // YouTube: använd cron-cachat värde om det finns, annars hämta on-demand
  let ytVideos: any[] = [];
  if (Array.isArray(org.latest_videos) && org.latest_videos.length > 0) {
    ytVideos = org.latest_videos;
  } else if (org.youtube_channel_id) {
    ytVideos = await fetchLatestVideos(org.youtube_channel_id, 5);
  }
  const primaryVideo = ytVideos[0] || (org.latest_sermon_url ? {
    id: "",
    title: org.latest_sermon_title || "",
    url: org.latest_sermon_url,
    embedUrl: org.latest_sermon_url,
    thumbnailUrl: "",
    publishedAt: "",
  } : null);

  return (
    <div>
      {/* Hero */}
      <section className="bg-stone-50 border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-5 py-14">
          <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">
            {org.city} {org.type && `· ${org.type}`}
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900 mb-3">{org.name}</h1>
          {org.description && <p className="text-lg text-stone-600 max-w-2xl">{org.description}</p>}
          {org.hours && <p className="text-sm text-stone-500 mt-3"><strong>Tider:</strong> {org.hours}</p>}
          {org.address && <p className="text-sm text-stone-500"><strong>Adress:</strong> {org.address}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            {org.website_url && <a href={org.website_url} className="text-olive-700 underline" target="_blank" rel="noopener">Webbplats</a>}
            {org.contact_email && <a href={`mailto:${org.contact_email}`} className="text-olive-700 underline">Kontakt</a>}
            <ShareButton
              title={org.name}
              text={org.description || `Läs om ${org.name} på testimony.se`}
              label="Dela"
              variant="secondary"
            />
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 py-12 grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          {org.about && (
            <section className="mb-12">
              <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">Om oss</h2>
              <div className="prose">
                {org.about.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
              </div>
            </section>
          )}

          {primaryVideo && (
            <section className="mb-12">
              <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">Senaste gudstjänsten</h2>
              {primaryVideo.title && (
                <p className="text-sm text-stone-500 mb-3">{primaryVideo.title}</p>
              )}
              <div className="aspect-video w-full bg-stone-900 rounded overflow-hidden shadow">
                <iframe
                  src={primaryVideo.embedUrl}
                  title={primaryVideo.title || `Gudstjänst från ${org.name}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {ytVideos.length > 1 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
                    Fler videor från {org.name}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ytVideos.slice(1).map(v => (
                      <a
                        key={v.id}
                        href={v.url}
                        target="_blank"
                        rel="noopener"
                        className="group block rounded-lg overflow-hidden border border-stone-200 hover:border-olive-500 bg-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={v.thumbnailUrl}
                          alt=""
                          className="w-full aspect-video object-cover"
                          loading="lazy"
                        />
                        <div className="p-3">
                          <div className="text-sm text-stone-800 group-hover:text-olive-700 line-clamp-2 leading-snug">
                            {v.title}
                          </div>
                          {v.publishedAt && (
                            <div className="text-xs text-stone-500 mt-1">
                              {new Date(v.publishedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {testimonies.length > 0 && (
            <section className="mb-12">
              <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-6">Vittnesbörd härifrån</h2>
              {testimonies.map((t: any) => (
                <FeedCard
                  key={t.id}
                  kind="testimony"
                  title={t.title}
                  body={t.lede || ""}
                  href={`/vittnesbord/${t.slug}`}
                  format={t.format}
                  coverImage={t.cover_image_url}
                  chainSize={t.chain_size}
                />
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-10">
          {volunteers.length > 0 && (
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3 text-stone-900">Volontärbehov</h3>
              <ul className="space-y-3 text-sm">
                {volunteers.map((v) => (
                  <li key={v.id}>
                    <Link href={`/volontar/${v.slug}`} className="block border border-stone-200 hover:border-olive-500 rounded p-3 bg-white">
                      <div className="font-medium text-stone-800">{v.title}</div>
                      <div className="text-xs text-stone-500">{v.commitment} · {v.category}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {prayers.length > 0 && (
            <div>
              <h3 className="font-serif text-xl font-semibold mb-3 text-stone-900">Böneämnen</h3>
              <ul className="space-y-3 text-sm">
                {prayers.map((p: any) => (
                  <li key={p.id} className="border-l-2 border-olive-500 pl-3">
                    {p.title && <div className="font-medium text-stone-800">{p.title}</div>}
                    <p className="text-stone-600">{p.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
