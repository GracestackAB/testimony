import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/config";
import { fetchDynamicSitemapUrls } from "@/lib/seo/dynamic-sitemap";
import { STATIC_SITEMAP_ROUTES } from "@/lib/seo/static-routes";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_SITEMAP_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const dynamic = await fetchDynamicSitemapUrls();
  const dynamicEntries: MetadataRoute.Sitemap = dynamic.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: route.lastModified ?? now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return [...staticEntries, ...dynamicEntries];
}
