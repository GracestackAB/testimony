import { shuffle } from "@/lib/games/kids-bible";
import type { Locale } from "@/lib/i18n/types";

export type KidsSillyStatement = {
  id: string;
  sceneEmoji: string;
  textSv: string;
  textEn: string;
  isTrue: boolean;
  explainSv: string;
  explainEn: string;
};

/** Sant eller uppenbart tokigt — roliga påståenden för barn 4+. */
export const KIDS_SILLY_STATEMENTS: KidsSillyStatement[] = [
  {
    id: "noah-ark-true",
    sceneEmoji: "🚢",
    textSv: "Noa byggde en stor ark.",
    textEn: "Noah built a big ark.",
    isTrue: true,
    explainSv: "Ja! Gud bad Noa bygga arken och rädda djuren.",
    explainEn: "Yes! God asked Noah to build the ark and save the animals.",
  },
  {
    id: "noah-rocket",
    sceneEmoji: "🚀",
    textSv: "Noa flög till månen med en raket.",
    textEn: "Noah flew to the moon in a rocket.",
    isTrue: false,
    explainSv: "Tokigt! Noa byggde en ark på vattnet — ingen raket.",
    explainEn: "Silly! Noah built an ark on the water — no rocket.",
  },
  {
    id: "jesus-bethlehem",
    sceneEmoji: "👶",
    textSv: "Jesus föddes i Betlehem.",
    textEn: "Jesus was born in Bethlehem.",
    isTrue: true,
    explainSv: "Ja! I en krubba i Betlehem föddes Guds Son.",
    explainEn: "Yes! God's Son was born in a manger in Bethlehem.",
  },
  {
    id: "jesus-submarine",
    sceneEmoji: "🛟",
    textSv: "Baby Jesus sov i en ubåt.",
    textEn: "Baby Jesus slept in a submarine.",
    isTrue: false,
    explainSv: "Tokigt! Han sov i en krubba bland djuren.",
    explainEn: "Silly! He slept in a manger among the animals.",
  },
  {
    id: "david-goliath",
    sceneEmoji: "🪨",
    textSv: "David besegrade jätten Goliat.",
    textEn: "David defeated the giant Goliath.",
    isTrue: true,
    explainSv: "Ja! Med en slunga och en sten — Gud hjälpte honom.",
    explainEn: "Yes! With a sling and a stone — God helped him.",
  },
  {
    id: "goliath-mouse",
    sceneEmoji: "🐭",
    textSv: "Goliat var liten som en mus.",
    textEn: "Goliath was tiny like a mouse.",
    isTrue: false,
    explainSv: "Tokigt! Goliat var en jättestor krigare.",
    explainEn: "Silly! Goliath was a huge warrior.",
  },
  {
    id: "daniel-lions",
    sceneEmoji: "🦁",
    textSv: "Daniel var i gropen med lejon.",
    textEn: "Daniel was in the pit with lions.",
    isTrue: true,
    explainSv: "Ja! Gud höll lejonen lugna hela natten.",
    explainEn: "Yes! God kept the lions calm all night.",
  },
  {
    id: "daniel-icecream",
    sceneEmoji: "🍦",
    textSv: "Daniel och lejonen åt glass tillsammans.",
    textEn: "Daniel and the lions ate ice cream together.",
    isTrue: false,
    explainSv: "Tokigt! Lejonen gjorde Daniel ingen ont — men ingen glass!",
    explainEn: "Silly! The lions didn't hurt Daniel — but no ice cream!",
  },
  {
    id: "jonah-fish",
    sceneEmoji: "🐋",
    textSv: "Jona var inne i en stor fisk.",
    textEn: "Jonah was inside a big fish.",
    isTrue: true,
    explainSv: "Ja! Fisken släppte ut honom när han bad till Gud.",
    explainEn: "Yes! The fish let him out when he prayed to God.",
  },
  {
    id: "fish-fly",
    sceneEmoji: "🐦",
    textSv: "Fisken flög som en fågel i himlen.",
    textEn: "The fish flew like a bird in the sky.",
    isTrue: false,
    explainSv: "Tokigt! Fisken simmade i havet med Jona inuti.",
    explainEn: "Silly! The fish swam in the sea with Jonah inside.",
  },
  {
    id: "moses-sea",
    sceneEmoji: "🌊",
    textSv: "Gud delade Röda havet för Mose.",
    textEn: "God parted the Red Sea for Moses.",
    isTrue: true,
    explainSv: "Ja! Folket gick på torr mark mitt i havet.",
    explainEn: "Yes! The people walked on dry ground through the sea.",
  },
  {
    id: "moses-bike",
    sceneEmoji: "🚲",
    textSv: "Mose cyklade över havet.",
    textEn: "Moses rode a bike across the sea.",
    isTrue: false,
    explainSv: "Tokigt! Han ledde folket till fots när vattnet delades.",
    explainEn: "Silly! He led the people on foot when the water parted.",
  },
  {
    id: "feeding-true",
    sceneEmoji: "🍞",
    textSv: "Jesus matade tusentals med bröd och fisk.",
    textEn: "Jesus fed thousands with bread and fish.",
    isTrue: true,
    explainSv: "Ja! En pojkes mat räckte till alla — ett under!",
    explainEn: "Yes! One boy's food was enough for everyone — a miracle!",
  },
  {
    id: "ark-ice",
    sceneEmoji: "🍦",
    textSv: "Arken var byggd av glass.",
    textEn: "The ark was made of ice cream.",
    isTrue: false,
    explainSv: "Tokigt! Arken var byggd av trä — stark och tålig.",
    explainEn: "Silly! The ark was built of wood — strong and sturdy.",
  },
  {
    id: "creation",
    sceneEmoji: "🌍",
    textSv: "Gud skapade himlen och jorden.",
    textEn: "God created the sky and the earth.",
    isTrue: true,
    explainSv: "Ja! I början skapade Gud allt med sitt ord.",
    explainEn: "Yes! In the beginning God created everything with his word.",
  },
  {
    id: "moon-dance",
    sceneEmoji: "🌙",
    textSv: "Elefanterna dansade på månen på arken.",
    textEn: "Elephants danced on the moon on the ark.",
    isTrue: false,
    explainSv: "Tokigt! Djuren var på arken — inte på månen!",
    explainEn: "Silly! The animals were on the ark — not on the moon!",
  },
];

export function statementText(s: KidsSillyStatement, locale: Locale): string {
  return locale === "en" ? s.textEn : s.textSv;
}

export function explainText(s: KidsSillyStatement, locale: Locale): string {
  return locale === "en" ? s.explainEn : s.explainSv;
}

export function buildKidsSillyRound(
  count = 8,
  rng: () => number = Math.random
): KidsSillyStatement[] {
  const pool = shuffle(KIDS_SILLY_STATEMENTS, rng);
  const trueOnes = pool.filter((s) => s.isTrue);
  const sillyOnes = pool.filter((s) => !s.isTrue);
  const half = Math.floor(count / 2);
  const picked = [
    ...shuffle(trueOnes, rng).slice(0, half),
    ...shuffle(sillyOnes, rng).slice(0, count - half),
  ];
  return shuffle(picked, rng).slice(0, Math.min(count, KIDS_SILLY_STATEMENTS.length));
}
