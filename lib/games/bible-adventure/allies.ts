import type { Locale } from "@/lib/i18n/types";
import type { AdventureScenarioId } from "./scenarios";

export type AllyId =
  | "obadiah"
  | "widow_zarephath"
  | "mordecai"
  | "hagai"
  | "cupbearer"
  | "reuben"
  | "cleopas"
  | "companion_road";

export type AllyDef = {
  id: AllyId;
  scenarioIds: AdventureScenarioId[];
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
  imagePath: string;
  emoji: string;
};

export const ALLIES: AllyDef[] = [
  {
    id: "obadiah",
    scenarioIds: ["elijah_carmel"],
    nameSv: "Obadja",
    nameEn: "Obadiah",
    descSv: "Palatsförvaltare som gömde hundra profeter — en hemlig vän i Ahab hus.",
    descEn: "Palace steward who hid a hundred prophets — a secret friend in Ahab's house.",
    imagePath: "/games/bible-adventure/allies/obadiah.png",
    emoji: "🏠",
  },
  {
    id: "widow_zarephath",
    scenarioIds: ["elijah_carmel"],
    nameSv: "Änkan i Sarepta",
    nameEn: "Widow of Zarephath",
    descSv: "Hon delade sitt sista mjöl — och oljan slutade aldrig.",
    descEn: "She shared her last flour — and the oil never ran dry.",
    imagePath: "/games/bible-adventure/allies/widow_zarephath.png",
    emoji: "🫒",
  },
  {
    id: "mordecai",
    scenarioIds: ["esther_palace"],
    nameSv: "Mordekai",
    nameEn: "Mordecai",
    descSv: "Din farbror vid palatsets port — viskar sanningen du behöver höra.",
    descEn: "Your cousin at the palace gate — whispering the truth you need to hear.",
    imagePath: "/games/bible-adventure/allies/mordecai.png",
    emoji: "📯",
  },
  {
    id: "hagai",
    scenarioIds: ["esther_palace"],
    nameSv: "Hagai",
    nameEn: "Hegai",
    descSv: "Hovmannen som smeker drottningar — han visar dig vägen till kungen.",
    descEn: "The eunuch who tends queens — he shows you the way to the king.",
    imagePath: "/games/bible-adventure/allies/hagai.png",
    emoji: "👘",
  },
  {
    id: "cupbearer",
    scenarioIds: ["joseph_pit"],
    nameSv: "Mundskänken",
    nameEn: "The cupbearer",
    descSv: "Han minns din tolkning i fängelset — en glimt av hopp i mörkret.",
    descEn: "He remembers your interpretation in prison — a glimmer of hope in the dark.",
    imagePath: "/games/bible-adventure/allies/cupbearer.png",
    emoji: "🍷",
  },
  {
    id: "reuben",
    scenarioIds: ["joseph_pit"],
    nameSv: "Ruben",
    nameEn: "Reuben",
    descSv: "Den äldste brodern som en gång sa: »Utgjut inte blod.«",
    descEn: "The eldest brother who once said: \"Do not shed blood.\"",
    imagePath: "/games/bible-adventure/allies/reuben.png",
    emoji: "🤝",
  },
  {
    id: "cleopas",
    scenarioIds: ["cleopas_road"],
    nameSv: "Kleopas",
    nameEn: "Cleopas",
    descSv: "Din följeslagare på vägen — delar sorg och bröd med dig.",
    descEn: "Your companion on the road — sharing grief and bread with you.",
    imagePath: "/games/bible-adventure/allies/cleopas.png",
    emoji: "🥾",
  },
  {
    id: "companion_road",
    scenarioIds: ["cleopas_road"],
    nameSv: "Den okände vandraren",
    nameEn: "The unknown traveler",
    descSv: "En främling som går bredvid — frågar varför ditt hjärta är så tungt.",
    descEn: "A stranger walking beside you — asking why your heart is so heavy.",
    imagePath: "/games/bible-adventure/allies/companion_road.png",
    emoji: "🌅",
  },
];

const ALLY_MAP = new Map(ALLIES.map((a) => [a.id, a]));

export function getAlly(id: AllyId): AllyDef | undefined {
  return ALLY_MAP.get(id);
}

export function isAllyId(id: string): id is AllyId {
  return ALLY_MAP.has(id as AllyId);
}

export function alliesForScenario(scenarioId: AdventureScenarioId): AllyDef[] {
  return ALLIES.filter((a) => a.scenarioIds.includes(scenarioId));
}

export function allyName(ally: AllyDef, locale: Locale): string {
  return locale === "en" ? ally.nameEn : ally.nameSv;
}

export function allyDesc(ally: AllyDef, locale: Locale): string {
  return locale === "en" ? ally.descEn : ally.descSv;
}

export function sanitizeAllyId(raw: unknown, scenarioId: AdventureScenarioId): AllyId | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim() as AllyId;
  if (!isAllyId(id)) return null;
  const ally = getAlly(id)!;
  return ally.scenarioIds.includes(scenarioId) ? id : null;
}

export function validAllyIdsForPrompt(scenarioId: AdventureScenarioId): string {
  return alliesForScenario(scenarioId)
    .map((a) => a.id)
    .join(", ");
}
