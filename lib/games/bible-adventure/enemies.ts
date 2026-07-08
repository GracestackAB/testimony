import type { Locale } from "@/lib/i18n/types";
import type { AdventureScenarioId } from "./scenarios";

export type EnemyId =
  | "baal_priests"
  | "king_ahab"
  | "haman"
  | "palace_guard"
  | "slave_traders"
  | "potiphar"
  | "prison_warden"
  | "road_bandits"
  | "roman_patrol";

export type EnemyDef = {
  id: EnemyId;
  scenarioIds: AdventureScenarioId[];
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
  /** Relativ path under /public */
  imagePath: string;
  threat: number;
  emoji: string;
};

export const ENEMIES: EnemyDef[] = [
  {
    id: "baal_priests",
    scenarioIds: ["elijah_carmel"],
    nameSv: "Baals präster",
    nameEn: "Priests of Baal",
    descSv: "Fyrahundra femtio präster som ropar till en tyst gud.",
    descEn: "Four hundred fifty priests crying to a silent god.",
    imagePath: "/games/bible-adventure/enemies/baal_priests.png",
    threat: 3,
    emoji: "🔥",
  },
  {
    id: "king_ahab",
    scenarioIds: ["elijah_carmel"],
    nameSv: "Kung Ahab",
    nameEn: "King Ahab",
    descSv: "Israels kung — vacklande mellan Baal och Herren.",
    descEn: "Israel's king — wavering between Baal and the Lord.",
    imagePath: "/games/bible-adventure/enemies/king_ahab.png",
    threat: 2,
    emoji: "👑",
  },
  {
    id: "haman",
    scenarioIds: ["esther_palace"],
    nameSv: "Haman",
    nameEn: "Haman",
    descSv: "Agagiten som söker judarnas fördärv.",
    descEn: "The Agagite who seeks the Jews' destruction.",
    imagePath: "/games/bible-adventure/enemies/haman.png",
    threat: 4,
    emoji: "⚔️",
  },
  {
    id: "palace_guard",
    scenarioIds: ["esther_palace"],
    nameSv: "Palatsets väktare",
    nameEn: "Palace guard",
    descSv: "Persiska soldater vid den inre gården.",
    descEn: "Persian soldiers at the inner court.",
    imagePath: "/games/bible-adventure/enemies/palace_guard.png",
    threat: 2,
    emoji: "🛡️",
  },
  {
    id: "slave_traders",
    scenarioIds: ["joseph_pit"],
    nameSv: "Ismaelitiska köpmän",
    nameEn: "Ishmaelite traders",
    descSv: "Karavan på väg mot Egypten med dig i bojor.",
    descEn: "A caravan bound for Egypt with you in chains.",
    imagePath: "/games/bible-adventure/enemies/slave_traders.png",
    threat: 2,
    emoji: "⛓️",
  },
  {
    id: "potiphar",
    scenarioIds: ["joseph_pit"],
    nameSv: "Potifar",
    nameEn: "Potiphar",
    descSv: "Faraos hovman — strikt men rättvis, tills lögnen når honom.",
    descEn: "Pharaoh's officer — strict yet fair, until the lie reaches him.",
    imagePath: "/games/bible-adventure/enemies/potiphar.png",
    threat: 3,
    emoji: "🏛️",
  },
  {
    id: "prison_warden",
    scenarioIds: ["joseph_pit"],
    nameSv: "Fängelsevakt",
    nameEn: "Prison warden",
    descSv: "Mörker och järn i det kungliga fängelset.",
    descEn: "Darkness and iron in the royal dungeon.",
    imagePath: "/games/bible-adventure/enemies/prison_warden.png",
    threat: 2,
    emoji: "🔒",
  },
  {
    id: "road_bandits",
    scenarioIds: ["cleopas_road"],
    nameSv: "Vägrovare",
    nameEn: "Road bandits",
    descSv: "Skuggor bland olivträden — fara på vägen till Emmaus.",
    descEn: "Shadows among the olive trees — danger on the road to Emmaus.",
    imagePath: "/games/bible-adventure/enemies/road_bandits.png",
    threat: 3,
    emoji: "🗡️",
  },
  {
    id: "roman_patrol",
    scenarioIds: ["cleopas_road"],
    nameSv: "Romersk patrull",
    nameEn: "Roman patrol",
    descSv: "Soldater som vakar efter påskens oro i Jerusalem.",
    descEn: "Soldiers watchful after the Passover unrest in Jerusalem.",
    imagePath: "/games/bible-adventure/enemies/roman_patrol.png",
    threat: 2,
    emoji: "🏺",
  },
];

const ENEMY_MAP = new Map(ENEMIES.map((e) => [e.id, e]));

export function getEnemy(id: EnemyId): EnemyDef | undefined {
  return ENEMY_MAP.get(id);
}

export function isEnemyId(id: string): id is EnemyId {
  return ENEMY_MAP.has(id as EnemyId);
}

export function enemiesForScenario(scenarioId: AdventureScenarioId): EnemyDef[] {
  return ENEMIES.filter((e) => e.scenarioIds.includes(scenarioId));
}

export function enemyName(enemy: EnemyDef, locale: Locale): string {
  return locale === "en" ? enemy.nameEn : enemy.nameSv;
}

export function enemyDesc(enemy: EnemyDef, locale: Locale): string {
  return locale === "en" ? enemy.descEn : enemy.descSv;
}

export function sanitizeEncounterId(raw: unknown, scenarioId: AdventureScenarioId): EnemyId | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim() as EnemyId;
  if (!isEnemyId(id)) return null;
  const enemy = getEnemy(id)!;
  return enemy.scenarioIds.includes(scenarioId) ? id : null;
}

export function validEnemyIdsForPrompt(scenarioId: AdventureScenarioId): string {
  return enemiesForScenario(scenarioId)
    .map((e) => e.id)
    .join(", ");
}
