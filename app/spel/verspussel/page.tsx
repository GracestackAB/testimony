import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VersePuzzleGame } from "@/components/games/VersePuzzleGame";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: `${t.games.versePuzzle.title} · testimony.se`,
    description: t.games.versePuzzle.subtitle,
  };
}

export default async function VersePuzzlePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const g = t.games.versePuzzle;

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <LanguageSwitcher />
        </div>
        <Link href="/spel" className="inline-block text-sm text-stone-500 hover:text-olive-700 mb-4">
          ← {t.games.backToHub}
        </Link>
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">{g.kicker}</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">{g.title}</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto leading-relaxed">{g.subtitle}</p>
      </header>
      <VersePuzzleGame />
    </div>
  );
}
