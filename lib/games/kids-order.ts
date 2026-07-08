import { shuffle } from "@/lib/games/kids-bible";
import type { Locale } from "@/lib/i18n/types";

export type KidsStoryStep = {
  order: number;
  emoji: string;
  labelSv: string;
  labelEn: string;
};

export type KidsStory = {
  id: string;
  titleSv: string;
  titleEn: string;
  steps: KidsStoryStep[];
  funFactSv: string;
  funFactEn: string;
};

export type ShuffledStoryStep = KidsStoryStep & {
  key: string;
};

export type KidsOrderRound = {
  story: KidsStory;
  shuffledSteps: ShuffledStoryStep[];
};

/** Tre steg i rätt ordning — enkla bibelberättelser för barn 4+. */
export const KIDS_STORIES: KidsStory[] = [
  {
    id: "noah",
    titleSv: "Noas ark",
    titleEn: "Noah's ark",
    steps: [
      { order: 1, emoji: "🙏", labelSv: "Gud pratar med Noa", labelEn: "God talks to Noah" },
      { order: 2, emoji: "🐘", labelSv: "Djuren går in", labelEn: "Animals go inside" },
      { order: 3, emoji: "🌈", labelSv: "Regnbågen kommer", labelEn: "The rainbow comes" },
    ],
    funFactSv: "Gud lovade att aldrig mer täcka hela jorden med vatten!",
    funFactEn: "God promised never to cover the whole earth with water again!",
  },
  {
    id: "jesus-birth",
    titleSv: "Jesus föds",
    titleEn: "Jesus is born",
    steps: [
      { order: 1, emoji: "👼", labelSv: "Ängeln hälsar Maria", labelEn: "Angel greets Mary" },
      { order: 2, emoji: "👶", labelSv: "Bebisen i krubban", labelEn: "Baby in the manger" },
      { order: 3, emoji: "⭐", labelSv: "Stjärnan lyser", labelEn: "The star shines" },
    ],
    funFactSv: "Jesus föddes i Betlehem — Guds Son till världen!",
    funFactEn: "Jesus was born in Bethlehem — God's Son came to the world!",
  },
  {
    id: "david",
    titleSv: "David & Goliat",
    titleEn: "David & Goliath",
    steps: [
      { order: 1, emoji: "🪨", labelSv: "David tar stenar", labelEn: "David takes stones" },
      { order: 2, emoji: "🎯", labelSv: "Slungan snurrar", labelEn: "The sling spins" },
      { order: 3, emoji: "🎉", labelSv: "Goliat faller", labelEn: "Goliath falls" },
    ],
    funFactSv: "David liten men modig — Gud gav honom kraft!",
    funFactEn: "David was small but brave — God gave him strength!",
  },
  {
    id: "jonah",
    titleSv: "Jona",
    titleEn: "Jonah",
    steps: [
      { order: 1, emoji: "⛵", labelSv: "Jona på båten", labelEn: "Jonah on the boat" },
      { order: 2, emoji: "🐋", labelSv: "Den stora fisken", labelEn: "The big fish" },
      { order: 3, emoji: "🏖️", labelSv: "Ute på stranden", labelEn: "Out on the shore" },
    ],
    funFactSv: "Jona lärde sig att lyda Gud — och Gud förlät honom.",
    funFactEn: "Jonah learned to obey God — and God forgave him.",
  },
  {
    id: "creation",
    titleSv: "Gud skapar",
    titleEn: "God creates",
    steps: [
      { order: 1, emoji: "💡", labelSv: "Det blir ljust", labelEn: "There is light" },
      { order: 2, emoji: "☁️", labelSv: "Himmel och moln", labelEn: "Sky and clouds" },
      { order: 3, emoji: "🌳", labelSv: "Träd och blommor", labelEn: "Trees and flowers" },
    ],
    funFactSv: "Gud såg att allt han skapat var gott!",
    funFactEn: "God saw that everything he made was good!",
  },
  {
    id: "feeding",
    titleSv: "Brödet räcker",
    titleEn: "Bread for everyone",
    steps: [
      { order: 1, emoji: "🍞", labelSv: "Pojken delar mat", labelEn: "Boy shares food" },
      { order: 2, emoji: "🙏", labelSv: "Jesus tackar Gud", labelEn: "Jesus thanks God" },
      { order: 3, emoji: "😊", labelSv: "Alla blir mätta", labelEn: "Everyone is full" },
    ],
    funFactSv: "Jesus gjorde lite mat till nog för tusentals!",
    funFactEn: "Jesus made a little food enough for thousands!",
  },
  {
    id: "daniel",
    titleSv: "Daniel & lejonen",
    titleEn: "Daniel & the lions",
    steps: [
      { order: 1, emoji: "🙏", labelSv: "Daniel ber", labelEn: "Daniel prays" },
      { order: 2, emoji: "🦁", labelSv: "Lejonen kommer", labelEn: "Lions come close" },
      { order: 3, emoji: "☀️", labelSv: "Morgon — han är trygg", labelEn: "Morning — he is safe" },
    ],
    funFactSv: "Gud skickade en ängel och höll lejonen lugna.",
    funFactEn: "God sent an angel and kept the lions calm.",
  },
  {
    id: "easter",
    titleSv: "Jesus lever",
    titleEn: "Jesus lives",
    steps: [
      { order: 1, emoji: "✝️", labelSv: "Jesus dör på korset", labelEn: "Jesus dies on the cross" },
      { order: 2, emoji: "🪨", labelSv: "Graven är stängd", labelEn: "The tomb is closed" },
      { order: 3, emoji: "✨", labelSv: "Jesus uppstår!", labelEn: "Jesus rises!" },
    ],
    funFactSv: "Jesus vann över döden — han lever för evigt!",
    funFactEn: "Jesus won over death — he lives forever!",
  },
];

export function storyTitle(story: KidsStory, locale: Locale): string {
  return locale === "en" ? story.titleEn : story.titleSv;
}

export function stepLabel(step: KidsStoryStep, locale: Locale): string {
  return locale === "en" ? step.labelEn : step.labelSv;
}

export function storyFunFact(story: KidsStory, locale: Locale): string {
  return locale === "en" ? story.funFactEn : story.funFactSv;
}

export function buildStoryRound(story: KidsStory, rng: () => number = Math.random): KidsOrderRound {
  const shuffledSteps = shuffle(story.steps, rng).map((step, i) => ({
    ...step,
    key: `${story.id}-step-${step.order}-${i}`,
  }));
  return { story, shuffledSteps };
}

export function buildKidsOrderRound(
  count = 4,
  rng: () => number = Math.random
): KidsOrderRound[] {
  return shuffle(KIDS_STORIES, rng)
    .slice(0, Math.min(count, KIDS_STORIES.length))
    .map((story) => buildStoryRound(story, rng));
}

/** True if tapped steps are in ascending story order (1 → 2 → 3). */
export function isCorrectOrder(tapped: ShuffledStoryStep[]): boolean {
  if (tapped.length !== 3) return false;
  return tapped[0].order === 1 && tapped[1].order === 2 && tapped[2].order === 3;
}
