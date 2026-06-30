import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: `${t.games.hubTitle} · testimony.se`,
    description: t.games.hubSubtitle,
  };
}

const GAMES = [
  {
    slug: "bibel-quiz",
    emoji: "📖",
    available: true,
  },
  {
    slug: "liknelser",
    emoji: "✨",
    available: true,
  },
] as const;

export default async function GamesPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const g = t.games;

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">
          {g.hubKicker}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">
          {g.hubTitle}
        </h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto leading-relaxed">
          {g.hubSubtitle}
        </p>
      </header>

      <ul className="space-y-4">
        {GAMES.map((game) => {
          const card = g.cards[game.slug as keyof typeof g.cards];
          if (!card) return null;

          if (!game.available) {
            return (
              <li
                key={game.slug}
                className="p-6 border border-dashed border-stone-300 rounded-xl bg-stone-50 opacity-70"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl" aria-hidden>
                    {game.emoji}
                  </span>
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-stone-700">
                      {card.title}
                    </h2>
                    <p className="text-sm text-stone-500 mt-1">{card.description}</p>
                    <span className="inline-block mt-3 text-xs uppercase tracking-wider text-stone-400">
                      {g.comingSoon}
                    </span>
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={game.slug}>
              <Link
                href={`/spel/${game.slug}`}
                className="group flex items-start gap-4 p-6 border border-stone-200 rounded-xl bg-parchment hover:bg-olive-50/40 hover:border-olive-300 transition-colors"
              >
                <span className="text-3xl" aria-hidden>
                  {game.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif text-xl font-semibold text-stone-900 group-hover:text-olive-800">
                    {card.title}
                  </h2>
                  <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                    {card.description}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-olive-700">
                    {g.playNow}
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
