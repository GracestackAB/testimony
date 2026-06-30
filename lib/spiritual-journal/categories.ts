import type { SpiritualJournalCategory } from "./types";

export type CategoryMeta = {
  id: SpiritualJournalCategory;
  icon: string;
};

export const CATEGORY_ORDER: CategoryMeta[] = [
  { id: "gratitude", icon: "☀️" },
  { id: "prayer", icon: "🙏" },
  { id: "answered_prayer", icon: "✨" },
  { id: "reflection", icon: "📖" },
  { id: "scripture", icon: "✝️" },
  { id: "promise", icon: "💎" },
  { id: "confession", icon: "🕊️" },
  { id: "growth", icon: "🌱" },
];

/** Dagliga reflektionsfrågor — roterar per dag och kategori. */
export function dailyPrompt(category: SpiritualJournalCategory, locale: "sv" | "en"): string {
  const prompts: Record<SpiritualJournalCategory, { sv: string[]; en: string[] }> = {
    gratitude: {
      sv: [
        "Vad är du tacksam för idag?",
        "Vilken välsignelse från Gud vill du minnas?",
        "Vem eller vad har Herren satt på ditt hjärta att tacka för?",
      ],
      en: [
        "What are you thankful for today?",
        "Which blessing from God do you want to remember?",
        "Who or what has the Lord put on your heart to thank Him for?",
      ],
    },
    prayer: {
      sv: [
        "Vad vill du bära fram inför Gud just nu?",
        "Vem behöver du be för idag?",
        "Vad ligger tungt på ditt hjärta?",
      ],
      en: [
        "What do you want to bring before God right now?",
        "Who do you need to pray for today?",
        "What feels heavy on your heart?",
      ],
    },
    confession: {
      sv: [
        "Vad behöver du lägga fram för Herren i ödmjukhet?",
        "Var behöver du förlåtelse och nåd idag?",
        "Vad vill du lämna vid Jesu fötter?",
      ],
      en: [
        "What do you need to bring before the Lord in humility?",
        "Where do you need forgiveness and grace today?",
        "What do you want to leave at Jesus' feet?",
      ],
    },
    reflection: {
      sv: [
        "Vad har Gud visat dig genom Bibeln eller livet idag?",
        "Hur har Herren varit nära dig nyligen?",
        "Vad lärde du dig om Gud den senaste tiden?",
      ],
      en: [
        "What has God shown you through Scripture or life today?",
        "How has the Lord been near you recently?",
        "What have you learned about God lately?",
      ],
    },
    promise: {
      sv: [
        "Vilket löfte från Gud vill du hålla fast vid?",
        "Vilken bibelvers är en förankring för dig just nu?",
        "Vad har Herren talat till ditt hjärta?",
      ],
      en: [
        "Which promise from God do you want to hold on to?",
        "Which Bible verse is an anchor for you right now?",
        "What has the Lord spoken to your heart?",
      ],
    },
    scripture: {
      sv: [
        "Vilken vers vill du lära dig eller meditera över?",
        "Skriv en vers som uppmuntrar dig och varför.",
        "Vilken text vill du gömma i hjärtat denna vecka?",
      ],
      en: [
        "Which verse do you want to learn or meditate on?",
        "Write a verse that encourages you and why.",
        "Which passage do you want to hide in your heart this week?",
      ],
    },
    answered_prayer: {
      sv: [
        "Hur har Gud svarat på en bön nyligen?",
        "Vilket bönesvar vill du minnas privat?",
        "När märkte du att Herren ingrep?",
      ],
      en: [
        "How has God answered a prayer recently?",
        "Which answered prayer do you want to remember privately?",
        "When did you notice the Lord intervening?",
      ],
    },
    growth: {
      sv: [
        "Vilket steg i tron vill du ta denna vecka?",
        "Vilken egenskap hos Jesus vill du efterlikna?",
        "Vad är ditt andliga mål just nu?",
      ],
      en: [
        "What step of faith do you want to take this week?",
        "Which quality of Jesus do you want to reflect?",
        "What is your spiritual goal right now?",
      ],
    },
  };

  const list = prompts[category][locale];
  const day = Math.floor(Date.now() / 86_400_000);
  return list[day % list.length];
}
