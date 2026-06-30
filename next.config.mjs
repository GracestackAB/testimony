const apiOrigin =
  process.env.SUPABASE_API_ORIGIN ||
  "https://ca-testimony-api.livelyflower-b897116b.swedencentral.azurecontainerapps.io";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    // Auth/REST via samma origin — enklare cookies, stabil Google redirect_uri (www.testimony.se)
    return [
      {
        source: "/auth/v1/:path*",
        destination: `${apiOrigin}/auth/v1/:path*`,
      },
      {
        source: "/rest/v1/:path*",
        destination: `${apiOrigin}/rest/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

import withPWA from "@ducanh2912/next-pwa";

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  workboxOptions: {
    importScripts: ["/push-handler.js"],
  },
})(nextConfig);
