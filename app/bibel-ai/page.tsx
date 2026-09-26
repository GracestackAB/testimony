import { BibleAiApp } from "@/components/bible/BibleAiApp";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/seo/config";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const g = t.bibelAi;
  return {
    title: g.title,
    description: `${g.subtitle} ${g.tabProfessorHint}`,
    keywords: [
      ...(locale === "sv"
        ? ["bibel-ai", "bibelprofessor", "bibelfrågor", "bibelkunskap", "kristen ai"]
        : ["bible ai", "bible professor", "scripture questions", "christian ai"]),
    ],
    openGraph: {
      url: new URL("/bibel-ai", siteUrl()).toString(),
      title: `${g.title} · testimony.se`,
      description: g.subtitle,
    },
  };
}

export default function BibelAiPage() {
  return <BibleAiApp />;
}
