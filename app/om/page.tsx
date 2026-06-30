import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.about.title };
}

export default async function About() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="max-w-2xl mx-auto px-5 py-14 prose prose-stone">
      <h1>{t.about.title}</h1>
      <p className="italic font-serif text-xl">{t.about.tagline}</p>
      <p>{t.about.intro}</p>
      <h2>{t.about.pillarsTitle}</h2>
      <ul>
        <li>{t.about.pillarFeed}</li>
        <li>{t.about.pillarCatalog}</li>
        <li>{t.about.pillarVolunteer}</li>
        <li>{t.about.pillarFood}</li>
      </ul>
      <h2>{t.about.whoTitle}</h2>
      <p>{t.about.whoBody}</p>
      <h2>{t.about.principlesTitle}</h2>
      <ul>
        <li>{t.about.principle1}</li>
        <li>{t.about.principle2}</li>
        <li>{t.about.principle3}</li>
        <li>{t.about.principle4}</li>
      </ul>
      <blockquote>&ldquo;{t.about.quote}&rdquo;</blockquote>
    </div>
  );
}
