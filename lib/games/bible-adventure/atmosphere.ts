import type { Locale } from "@/lib/i18n/types";
import type { AdventureScenarioId } from "./scenarios";

type AtmosphereLine = Record<Locale, string>;

const LINES: Record<AdventureScenarioId, AtmosphereLine[]> = {
  elijah_carmel: [
    { sv: "Vinden bär doften av regn som ännu inte fallit…", en: "The wind carries the scent of rain not yet fallen…" },
    { sv: "Baals präster skanderar — himlen förblir stum.", en: "Baal's priests chant — heaven remains silent." },
    { sv: "Folket samlas i tyst förväntan vid Karmels sluttningar.", en: "The people gather in hushed expectation on Carmel's slopes." },
    { sv: "Elden ska falla. Frågan är från vem.", en: "Fire must fall. The question is from whom." },
  ],
  esther_palace: [
    { sv: "Palatsets gårdar ekar av steg och viskningar.", en: "The palace courts echo with footsteps and whispers." },
    { sv: "Rökelse och makt hänger i luften vid Susa.", en: "Incense and power hang in the air at Susa." },
    { sv: "En drottnings mantel bär både nåd och fara.", en: "A queen's mantle carries both grace and peril." },
    { sv: "Guldet glimmar — men blodet kan flöda i mörker.", en: "Gold glimmers — but blood may flow in darkness." },
  ],
  joseph_pit: [
    { sv: "Öknens hetta svider; bojorna skär.", en: "The desert heat burns; the shackles bite." },
    { sv: "Karavanens kameler brölar i fjärran.", en: "The caravan's camels bellow in the distance." },
    { sv: "Drömmar om sheaves som böjer sig — minns du dem?", en: "Dreams of bowing sheaves — do you remember?" },
    { sv: "Herren var med dig i faderns hus. Är Han här?", en: "The Lord was with you in your father's house. Is He here?" },
  ],
  cleopas_road: [
    { sv: "Solen sjunker bakom Emmaus; skuggorna förlängs.", en: "The sun sinks behind Emmaus; shadows lengthen." },
    { sv: "Jerusalem ligger bakom er — tomma gravar och sorg.", en: "Jerusalem lies behind you — empty tombs and grief." },
    { sv: "Steg på stenvägen; ett okänt ansikte närmar sig.", en: "Footsteps on the stone road; an unknown face draws near." },
    { sv: "Brödet i packningen räcker knappt till en måltid.", en: "The bread in your pack is barely enough for one meal." },
  ],
};

export function atmosphereLine(scenarioId: AdventureScenarioId, turn: number, locale: Locale): string {
  const pool = LINES[scenarioId];
  return pool[turn % pool.length]![locale];
}
