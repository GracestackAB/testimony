import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { LocaleProvider } from "@/lib/i18n/client";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/seo/config";
import { canonicalUrl } from "@/lib/seo/canonical";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const url = siteUrl();
  const canonical = canonicalUrl(url, (await headers()).get("x-pathname"));
  const ogLocale = locale === "en" ? "en_GB" : "sv_SE";

  return {
    metadataBase: new URL(url),
    title: {
      default: t.meta.siteTitle,
      template: "%s · testimony.se",
    },
    description: t.meta.siteDescription,
    keywords: t.meta.siteKeywords,
    applicationName: "testimony.se",
    alternates: {
      canonical,
      languages: {
        "sv-SE": canonical,
        "en-GB": canonical,
        "x-default": canonical,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    openGraph: {
      type: "website",
      siteName: "testimony.se",
      url: canonical,
      title: t.meta.siteTitle,
      description: t.meta.siteDescription,
      locale: ogLocale,
      alternateLocale: locale === "en" ? ["sv_SE"] : ["en_GB"],
      images: [{ url: "/icon-512.png?v=4", width: 512, height: 512, alt: "testimony.se" }],
    },
    twitter: {
      card: "summary",
      title: t.meta.siteTitle,
      description: t.meta.siteDescription,
      images: ["/icon-512.png?v=4"],
    },
    icons: {
      icon: [
        { url: "/favicon.ico?v=4", sizes: "32x32" },
        { url: "/favicon-16.png?v=4", type: "image/png", sizes: "16x16" },
        { url: "/favicon-32.png?v=4", type: "image/png", sizes: "32x32" },
        { url: "/icon-192.png?v=4", type: "image/png", sizes: "192x192" },
        { url: "/icon-512.png?v=4", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/apple-touch-icon.png?v=4", sizes: "180x180" }],
    },
    manifest: "/manifest.json?v=4",
    appleWebApp: {
      capable: true,
      title: "Testimony",
      statusBarStyle: "black-translucent",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#5f7438",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <html lang={locale} className="bg-parchment">
      <body className="min-h-screen flex flex-col">
        <SiteJsonLd locale={locale} description={t.meta.siteDescription} />
        <LocaleProvider locale={locale}>
          <ToastProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
