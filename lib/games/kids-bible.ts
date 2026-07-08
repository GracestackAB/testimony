import type { Locale } from "@/lib/i18n/types";

export type KidsOption = {
  emoji: string;
  labelSv: string;
  labelEn: string;
  correct: boolean;
};

export type KidsQuestion = {
  id: string;
  sceneEmoji: string;
  questionSv: string;
  questionEn: string;
  options: KidsOption[];
  funFactSv: string;
  funFactEn: string;
};

/** Bibelberättelser med enkla visuella frågor — lämpade för barn 4+. */
export const KIDS_BIBLE_QUESTIONS: KidsQuestion[] = [
  {
    id: "noah-ark",
    sceneEmoji: "🚢",
    questionSv: "Vem byggde arken?",
    questionEn: "Who built the ark?",
    options: [
      { emoji: "🧔", labelSv: "Noa", labelEn: "Noah", correct: true },
      { emoji: "👑", labelSv: "En kung", labelEn: "A king", correct: false },
      { emoji: "🦁", labelSv: "Ett lejon", labelEn: "A lion", correct: false },
    ],
    funFactSv: "Noa byggde en stor ark — och Gud räddade djuren!",
    funFactEn: "Noah built a huge ark — and God saved the animals!",
  },
  {
    id: "noah-animals",
    sceneEmoji: "🌈",
    questionSv: "Vad tog Noa med på arken?",
    questionEn: "What did Noah take on the ark?",
    options: [
      { emoji: "🐘", labelSv: "Djur", labelEn: "Animals", correct: true },
      { emoji: "🚗", labelSv: "Bilar", labelEn: "Cars", correct: false },
      { emoji: "🎈", labelSv: "Ballonger", labelEn: "Balloons", correct: false },
    ],
    funFactSv: "På arken fanns par av alla djur — och efteråt kom en regnbåge!",
    funFactEn: "The ark had pairs of every animal — and afterward came a rainbow!",
  },
  {
    id: "baby-jesus",
    sceneEmoji: "⭐",
    questionSv: "Var sov baby Jesus?",
    questionEn: "Where did baby Jesus sleep?",
    options: [
      { emoji: "🐄", labelSv: "I en krubba", labelEn: "In a manger", correct: true },
      { emoji: "🏰", labelSv: "I ett slott", labelEn: "In a castle", correct: false },
      { emoji: "🛏️", labelSv: "I en stor säng", labelEn: "In a big bed", correct: false },
    ],
    funFactSv: "Jesus föddes i Betlehem — stjärnan ledde de visa männen dit.",
    funFactEn: "Jesus was born in Bethlehem — a star led the wise men there.",
  },
  {
    id: "david-goliath",
    sceneEmoji: "🪨",
    questionSv: "Vad använde David mot Goliat?",
    questionEn: "What did David use against Goliath?",
    options: [
      { emoji: "🎯", labelSv: "Slunga & sten", labelEn: "Sling & stone", correct: true },
      { emoji: "⚔️", labelSv: "Ett svärd", labelEn: "A sword", correct: false },
      { emoji: "🏹", labelSv: "En pilbåge", labelEn: "A bow", correct: false },
    ],
    funFactSv: "David var modig — Gud hjälpte honom besegra den stora jätten!",
    funFactEn: "David was brave — God helped him defeat the giant!",
  },
  {
    id: "jonah-fish",
    sceneEmoji: "🌊",
    questionSv: "Vem var inne i den stora fisken?",
    questionEn: "Who was inside the big fish?",
    options: [
      { emoji: "🧔", labelSv: "Jona", labelEn: "Jonah", correct: true },
      { emoji: "🧔‍♂️", labelSv: "Mose", labelEn: "Moses", correct: false },
      { emoji: "👑", labelSv: "Kung Saul", labelEn: "King Saul", correct: false },
    ],
    funFactSv: "Jona lärde sig lyda Gud — fisken släppte ut honom vid stranden!",
    funFactEn: "Jonah learned to obey God — the fish let him out on the shore!",
  },
  {
    id: "daniel-lions",
    sceneEmoji: "🦁",
    questionSv: "Vilka djur var Daniel med i gropen?",
    questionEn: "Which animals were with Daniel in the pit?",
    options: [
      { emoji: "🦁", labelSv: "Lejon", labelEn: "Lions", correct: true },
      { emoji: "🐻", labelSv: "Björnar", labelEn: "Bears", correct: false },
      { emoji: "🐰", labelSv: "Kaniner", labelEn: "Rabbits", correct: false },
    ],
    funFactSv: "Gud stängde lejonens gap — Daniel var trygg hela natten!",
    funFactEn: "God shut the lions' mouths — Daniel was safe all night!",
  },
  {
    id: "moses-sea",
    sceneEmoji: "🌊",
    questionSv: "Vad gjorde Gud vid Röda havet?",
    questionEn: "What did God do at the Red Sea?",
    options: [
      { emoji: "🌊", labelSv: "Delade vattnet", labelEn: "Parted the water", correct: true },
      { emoji: "🔥", labelSv: "Tände en eld", labelEn: "Lit a fire", correct: false },
      { emoji: "⛰️", labelSv: "Flyttade ett berg", labelEn: "Moved a mountain", correct: false },
    ],
    funFactSv: "Mose ledde folket på torr mark — Gud öppnade vägen!",
    funFactEn: "Moses led the people on dry ground — God opened the way!",
  },
  {
    id: "adam-garden",
    sceneEmoji: "🌳",
    questionSv: "Vem var den första människan?",
    questionEn: "Who was the first person?",
    options: [
      { emoji: "👨", labelSv: "Adam", labelEn: "Adam", correct: true },
      { emoji: "🦸", labelSv: "En superhjälte", labelEn: "A superhero", correct: false },
      { emoji: "🤖", labelSv: "En robot", labelEn: "A robot", correct: false },
    ],
    funFactSv: "Adam och Eva bodde i Edens trädgård — skapade av Gud med kärlek.",
    funFactEn: "Adam and Eve lived in the Garden of Eden — created by God with love.",
  },
  {
    id: "jesus-water",
    sceneEmoji: "⛵",
    questionSv: "På vad gick Jesus?",
    questionEn: "What did Jesus walk on?",
    options: [
      { emoji: "💧", labelSv: "Vattnet", labelEn: "The water", correct: true },
      { emoji: "☁️", labelSv: "Molnen", labelEn: "The clouds", correct: false },
      { emoji: "🧊", labelSv: "Isen", labelEn: "The ice", correct: false },
    ],
    funFactSv: "Jesus gick på Galileiska sjön — hans lärjungar blev förvånade!",
    funFactEn: "Jesus walked on the Sea of Galilee — his disciples were amazed!",
  },
  {
    id: "feeding-5000",
    sceneEmoji: "🍞",
    questionSv: "Vad matade Jesus fem tusen med?",
    questionEn: "What did Jesus feed five thousand with?",
    options: [
      { emoji: "🍞", labelSv: "Bröd & fisk", labelEn: "Bread & fish", correct: true },
      { emoji: "🍕", labelSv: "Pizza", labelEn: "Pizza", correct: false },
      { emoji: "🍦", labelSv: "Glass", labelEn: "Ice cream", correct: false },
    ],
    funFactSv: "En pojke delade sitt bröd och sin fisk — Jesus gjorde det till nog för alla!",
    funFactEn: "A boy shared his bread and fish — Jesus made it enough for everyone!",
  },
  {
    id: "zaccheus",
    sceneEmoji: "🌳",
    questionSv: "Vad klättrade Sakkeus upp i?",
    questionEn: "What did Zacchaeus climb?",
    options: [
      { emoji: "🌳", labelSv: "Ett träd", labelEn: "A tree", correct: true },
      { emoji: "🏔️", labelSv: "Ett berg", labelEn: "A mountain", correct: false },
      { emoji: "🪜", labelSv: "En stege hemma", labelEn: "A ladder at home", correct: false },
    ],
    funFactSv: "Jesus såg Sakkeus i trädet — och blev hans vän!",
    funFactEn: "Jesus saw Zacchaeus in the tree — and became his friend!",
  },
  {
    id: "joseph-coat",
    sceneEmoji: "🧥",
    questionSv: "Vad var speciellt med Josefs kläder?",
    questionEn: "What was special about Joseph's clothes?",
    options: [
      { emoji: "🌈", labelSv: "Färggrann kåpa", labelEn: "A colorful coat", correct: true },
      { emoji: "👟", labelSv: "Blinkande skor", labelEn: "Blinking shoes", correct: false },
      { emoji: "🎩", labelSv: "En hatt", labelEn: "A hat", correct: false },
    ],
    funFactSv: "Josef hade en vacker kåpa — Gud var med honom även i Egypten.",
    funFactEn: "Joseph had a beautiful coat — God was with him even in Egypt.",
  },
  {
    id: "samson-hair",
    sceneEmoji: "💪",
    questionSv: "Vad var starkt hos Samson?",
    questionEn: "What made Samson strong?",
    options: [
      { emoji: "💇", labelSv: "Hans hår", labelEn: "His hair", correct: true },
      { emoji: "🥛", labelSv: "Mjölken han drack", labelEn: "The milk he drank", correct: false },
      { emoji: "👟", labelSv: "Hans skor", labelEn: "His shoes", correct: false },
    ],
    funFactSv: "Gud gav Samson kraft — han skulle ta hand om sitt löfte.",
    funFactEn: "God gave Samson strength — he was to keep his promise.",
  },
  {
    id: "angel-mary",
    sceneEmoji: "👼",
    questionSv: "Vad berättade ängeln för Maria?",
    questionEn: "What did the angel tell Mary?",
    options: [
      { emoji: "👶", labelSv: "Hon får en baby", labelEn: "She will have a baby", correct: true },
      { emoji: "🐶", labelSv: "Hon får en hund", labelEn: "She will get a dog", correct: false },
      { emoji: "🏠", labelSv: "Hon flyttar slott", labelEn: "She moves to a castle", correct: false },
    ],
    funFactSv: "Ängeln Gabriel sa att Maria skulle föda Jesus — Guds Son!",
    funFactEn: "The angel Gabriel said Mary would bear Jesus — God's Son!",
  },
  {
    id: "peter-fisher",
    sceneEmoji: "🎣",
    questionSv: "Vad var Petrus innan han följde Jesus?",
    questionEn: "What was Peter before he followed Jesus?",
    options: [
      { emoji: "🎣", labelSv: "Fiskare", labelEn: "A fisherman", correct: true },
      { emoji: "👨‍⚕️", labelSv: "Läkare", labelEn: "A doctor", correct: false },
      { emoji: "🧑‍🍳", labelSv: "Kock", labelEn: "A cook", correct: false },
    ],
    funFactSv: "Jesus sa: Följ mig! — och Petrus lämnade båten.",
    funFactEn: "Jesus said: Follow me! — and Peter left his boat.",
  },
  {
    id: "jericho",
    sceneEmoji: "🎺",
    questionSv: "Hur föll Jerikos murar?",
    questionEn: "How did the walls of Jericho fall?",
    options: [
      { emoji: "🎺", labelSv: "Med trumpeter", labelEn: "With trumpets", correct: true },
      { emoji: "🔨", labelSv: "Med hammare", labelEn: "With hammers", correct: false },
      { emoji: "💨", labelSv: "Med en fläkt", labelEn: "With a fan", correct: false },
    ],
    funFactSv: "Folket gick runt staden och blåste i trumpeter — Gud gjorde resten!",
    funFactEn: "The people marched around the city and blew trumpets — God did the rest!",
  },
];

export type ShuffledKidsQuestion = KidsQuestion & {
  shuffledOptions: KidsOption[];
};

export function questionText(q: KidsQuestion, locale: Locale): string {
  return locale === "en" ? q.questionEn : q.questionSv;
}

export function funFactText(q: KidsQuestion, locale: Locale): string {
  return locale === "en" ? q.funFactEn : q.funFactSv;
}

export function optionLabel(opt: KidsOption, locale: Locale): string {
  return locale === "en" ? opt.labelEn : opt.labelSv;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build a kids round with shuffled questions and shuffled answer options.
 */
export function buildKidsRound(
  count = 8,
  rng: () => number = Math.random
): ShuffledKidsQuestion[] {
  const picked = shuffle(KIDS_BIBLE_QUESTIONS, rng).slice(0, Math.min(count, KIDS_BIBLE_QUESTIONS.length));
  return picked.map((q) => ({
    ...q,
    shuffledOptions: shuffle(q.options, rng),
  }));
}

export function correctOptionIndex(options: KidsOption[]): number {
  return options.findIndex((o) => o.correct);
}
