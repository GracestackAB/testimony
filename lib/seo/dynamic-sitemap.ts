import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { SitemapEntry } from "@/lib/seo/static-routes";

type DynamicUrl = Pick<SitemapEntry, "path" | "changeFrequency" | "priority"> & {
  lastModified?: Date;
};

/**
 * Hämtar publicerade innehålls-URL:er för sitemap (begränsat antal per typ).
 */
export async function fetchDynamicSitemapUrls(): Promise<DynamicUrl[]> {
  try {
    const svc = await createServiceClient();
    const limit = 500;

    const [testimonies, ministries, volunteer, worship, forum, bible] = await Promise.all([
      svc
        .from("testimonies")
        .select("slug, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(limit),
      svc
        .from("organizations")
        .select("slug, updated_at")
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(limit),
      svc
        .from("volunteer_opportunities")
        .select("slug, updated_at")
        .eq("status", "open")
        .order("updated_at", { ascending: false })
        .limit(limit),
      svc
        .from("worship_songs")
        .select("slug, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(200),
      svc
        .from("forum_threads")
        .select("slug, created_at")
        .is("deleted_at", null)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(200),
      svc
        .from("daily_bible")
        .select("for_date, published_at")
        .eq("status", "published")
        .order("for_date", { ascending: false })
        .limit(90),
    ]);

    const urls: DynamicUrl[] = [];

    for (const row of testimonies.data ?? []) {
      if (!row.slug) continue;
      urls.push({
        path: `/vittnesbord/${row.slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
        lastModified: row.published_at ? new Date(row.published_at) : undefined,
      });
    }

    for (const row of ministries.data ?? []) {
      if (!row.slug) continue;
      urls.push({
        path: `/plats/${row.slug}`,
        changeFrequency: "weekly",
        priority: 0.65,
        lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
      });
    }

    for (const row of volunteer.data ?? []) {
      if (!row.slug) continue;
      urls.push({
        path: `/volontar/${row.slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
        lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
      });
    }

    for (const row of worship.data ?? []) {
      if (!row.slug) continue;
      urls.push({
        path: `/lovsang/${row.slug}`,
        changeFrequency: "monthly",
        priority: 0.55,
        lastModified: row.published_at ? new Date(row.published_at) : undefined,
      });
    }

    for (const row of forum.data ?? []) {
      if (!row.slug) continue;
      urls.push({
        path: `/forum/t/${row.slug}`,
        changeFrequency: "weekly",
        priority: 0.5,
        lastModified: row.created_at ? new Date(row.created_at) : undefined,
      });
    }

    for (const row of bible.data ?? []) {
      if (!row.for_date) continue;
      urls.push({
        path: `/dagens-bibeltext/${row.for_date}`,
        changeFrequency: "yearly",
        priority: 0.5,
        lastModified: row.published_at ? new Date(row.published_at) : undefined,
      });
    }

    return urls;
  } catch {
    return [];
  }
}
