import { ORG, siteUrl } from "@/lib/seo/config";

type Props = {
  locale: "sv" | "en";
  description: string;
};

/**
 * WebSite + Organization structured data for rich results.
 */
export function SiteJsonLd({ locale, description }: Props) {
  const url = siteUrl();
  const inLanguage = locale === "en" ? "en-GB" : "sv-SE";

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: ORG.name,
        description,
        inLanguage,
        publisher: { "@id": `${url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${url}/sok?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: ORG.name,
        legalName: ORG.legalName,
        url,
        logo: ORG.logo,
        email: ORG.email,
        sameAs: [],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
