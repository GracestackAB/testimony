import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { LocaleProvider } from "@/lib/i18n/client";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://testimony.se"),
    title: {
      default: t.meta.siteTitle,
      template: "%s · testimony.se",
    },
    description: t.meta.siteDescription,
    openGraph: {
      type: "website",
      siteName: "testimony.se",
      locale: locale === "en" ? "en_GB" : "sv_SE",
      images: [{ url: "/icon-512.png?v=3", width: 512, height: 512, alt: "testimony.se" }],
    },
    icons: {
      icon: [
        { url: "/favicon.ico?v=3", sizes: "32x32" },
        { url: "/favicon-16.png?v=3", type: "image/png", sizes: "16x16" },
        { url: "/favicon-32.png?v=3", type: "image/png", sizes: "32x32" },
        { url: "/icon-192.png?v=3", type: "image/png", sizes: "192x192" },
        { url: "/icon-512.png?v=3", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180" }],
    },
    manifest: "/manifest.json?v=3",
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
  return (
    <html lang={locale} className="bg-parchment">
      <body className="min-h-screen flex flex-col">
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
