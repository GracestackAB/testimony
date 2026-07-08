import Link from "next/link";
import { KidsSillyGame } from "@/components/games/KidsSillyGame";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: `${t.games.kidsSilly.title} · testimony.se`,
    description: t.games.kidsSilly.subtitle,
  };
}

export default async function KidsSillyPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const g = t.games.kidsSilly;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <LanguageSwitcher />
        </div>
        <Link
          href="/spel"
          className="inline-block text-sm text-stone-500 hover:text-olive-700 mb-4"
        >
          ← {t.games.backToHub}
        </Link>
        <div className="inline-block text-xs uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-2">
          {g.ageBadge}
        </div>
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{g.kicker}</div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900">{g.title}</h1>
        <p className="mt-3 text-stone-600 max-w-md mx-auto leading-relaxed text-sm sm:text-base">
          {g.subtitle}
        </p>
      </header>
      <KidsSillyGame />
    </div>
  );
}
