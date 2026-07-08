import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/konto/",
          "/meddelanden/",
          "/min-andakt",
          "/min-verksamhet/",
          "/api/",
          "/auth/",
          "/bjud-in/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
