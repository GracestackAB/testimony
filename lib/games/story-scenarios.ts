import type { Locale } from "@/lib/i18n/types";

export type StoryScenarioId =
  | "good_samaritan"
  | "prodigal_son"
  | "with_paul"
  | "nehemiah_wall";

export type StoryScenario = {
  id: StoryScenarioId;
  emoji: string;
  bibleRef: Record<Locale, string>;
  title: Record<Locale, string>;
  tagline: Record<Locale, string>;
  opening: Record<Locale, string>;
  initialChoices: Record<Locale, string[]>;
  /** Teologisk och narrativ kontext för AI-systemprompten. */
  aiBrief: Record<Locale, string>;
};

export const STORY_SCENARIOS: StoryScenario[] = [
  {
    id: "good_samaritan",
    emoji: "🛤️",
    bibleRef: { sv: "Lukas 10:25–37", en: "Luke 10:25–37" },
    title: { sv: "Den barmhärtige samariten", en: "The Good Samaritan" },
    tagline: {
      sv: "Du är en resenär på vägen mellan Jerusalem och Jeriko.",
      en: "You are a traveler on the road between Jerusalem and Jericho.",
    },
    opening: {
      sv:
        "Solen står högt över Judeens öken. Du har färdats hela förmiddagen och törsten biter. Framåt böjer sig vägen ner mot Jeriko — en väg ökänd för rövare. Du ser en man ligga vid vägkanten. Hans kläder är sönderslitna och han rör sig knappt.",
      en:
        "The sun hangs high over the wilderness of Judea. You have traveled all morning and thirst grips you. Ahead, the road bends down toward Jericho — a road infamous for robbers. You see a man lying by the roadside. His clothes are torn and he barely moves.",
    },
    initialChoices: {
      sv: [
        "Gå försiktigt närmare och se om han lever",
        "Korsa till andra sidan av vägen och skynda dig förbi",
        "Stanna och be en kort bön innan du bestämmer dig",
      ],
      en: [
        "Approach carefully to see if he is alive",
        "Cross to the other side of the road and hurry past",
        "Stop and pray briefly before deciding",
      ],
    },
    aiBrief: {
      sv:
        "Liknelsen om den barmhärtige samariten (Lukas 10). Spelaren är en resenär i första århundradet Judeen. Håll dig till Jesu berättelses värld: präst, levit, samarit, vägen till Jeriko. Temat är gränsöverskridande nåd och praktisk kärlek till nästan.",
      en:
        "The Parable of the Good Samaritan (Luke 10). The player is a traveler in first-century Judea. Stay within Jesus' story world: priest, Levite, Samaritan, road to Jericho. Theme: boundary-crossing mercy and practical love of neighbor.",
    },
  },
  {
    id: "prodigal_son",
    emoji: "🏠",
    bibleRef: { sv: "Lukas 15:11–32", en: "Luke 15:11–32" },
    title: { sv: "Den förlorade sonen", en: "The Prodigal Son" },
    tagline: {
      sv: "Du är den yngre sonen som längtar bortom gården.",
      en: "You are the younger son longing for life beyond the farm.",
    },
    opening: {
      sv:
        "Faderns gård har gett dig mat och tak över huvudet hela livet. Men du drömmer om staden — ljus, musik, röster som lockar. Du står inför fadern med en begäran som skaver i bröstet: din arvslott, nu.",
      en:
        "Your father's farm has given you food and shelter all your life. But you dream of the city — lights, music, voices that call. You stand before your father with a request that aches in your chest: your share of the inheritance, now.",
    },
    initialChoices: {
      sv: [
        "Be fadern om din del och förbered avresan",
        "Skjut upp beslutet och arbeta en säsong till",
        "Tala med din äldre bror om vad du känner",
      ],
      en: [
        "Ask your father for your share and prepare to leave",
        "Put off the decision and work another season",
        "Talk with your older brother about what you feel",
      ],
    },
    aiBrief: {
      sv:
        "Liknelsen om den förlorade sonen (Lukas 15). Spelaren kan identifiera sig med den yngre sonen, fadern eller brodern — följ deras val. Temat: omvändelse, faders nåd, avund och återkomst. Inga moderna tolkningar som motsäger evangeliet.",
      en:
        "The Parable of the Prodigal Son (Luke 15). The player may relate to the younger son, father, or older brother — follow their choices. Themes: repentance, the Father's grace, envy, and return. No modern reinterpretations that contradict the Gospel.",
    },
  },
  {
    id: "with_paul",
    emoji: "⛵",
    bibleRef: { sv: "Apostlagärningarna 16", en: "Acts 16" },
    title: { sv: "Med Paulus till Europa", en: "With Paul to Europe" },
    tagline: {
      sv: "Du följer Paulus när Macedonien-kallet bryter igenom i en syn.",
      en: "You follow Paul as the Macedonian call breaks through in a vision.",
    },
    opening: {
      sv:
        "I Troas samlas församlingen för bön. Paulus berättar om en syn i natten: en man från Macedonien bad honom komma och hjälpa dem. Skepp väntar i hamnen. Vinden luktar salt och möjligheter — och fara.",
      en:
        "In Troas the church gathers for prayer. Paul tells of a vision in the night: a man from Macedonia begged him to come and help them. Ships wait in the harbor. The wind smells of salt and possibility — and danger.",
    },
    initialChoices: {
      sv: [
        "Följ med Paulus ombord mot Philippi",
        "Stanna i Troas och stöd församlingen där",
        "Fråga Paulus varför Herren stängt andra dörrar",
      ],
      en: [
        "Board the ship with Paul toward Philippi",
        "Stay in Troas and support the church there",
        "Ask Paul why the Lord closed other doors",
      ],
    },
    aiBrief: {
      sv:
        "Paulus första europeiska resa (Apg 16). Spelaren är medresenär eller ny troende. Håll dig till biblisk historia: Troas, Philippi, fängelse, jordbävning, Lydia. Temat: missionskallelse, lidande för evangeliet, Guds vägledning.",
      en:
        "Paul's first journey to Europe (Acts 16). The player is a fellow traveler or new believer. Stay biblical: Troas, Philippi, prison, earthquake, Lydia. Themes: mission call, suffering for the Gospel, God's guidance.",
    },
  },
  {
    id: "nehemiah_wall",
    emoji: "🧱",
    bibleRef: { sv: "Nehemja 2–6", en: "Nehemiah 2–6" },
    title: { sv: "Nehemjas mur", en: "Nehemiah's Wall" },
    tagline: {
      sv: "Du arbetar med att återuppbygga Jerusalems mur under hot och motstånd.",
      en: "You labor to rebuild Jerusalem's wall under threat and opposition.",
    },
    opening: {
      sv:
        "Rök stiger från verkstäderna vid muren. Hammare slår mot sten. Nehemja har rest folket ur skam — men Sanballat och Tobia hånar från bergen. Du har en sektion av muren att bygga, och svärdet hänger vid din sida medan du arbetar.",
      en:
        "Smoke rises from workshops along the wall. Hammers strike stone. Nehemiah has roused the people from disgrace — but Sanballat and Tobiah mock from the hills. You have a section of wall to build, and a sword hangs at your side as you work.",
    },
    initialChoices: {
      sv: [
        "Arbeta hårdare på din sektion trots hånen",
        "Gå till Nehemja och fråga hur ni ska beväpna vakterna",
        "Tala uppmuntrande till en trött arbetare bredvid dig",
      ],
      en: [
        "Work harder on your section despite the mockery",
        "Go to Nehemiah and ask how to arm the guards",
        "Speak encouragement to a weary worker beside you",
      ],
    },
    aiBrief: {
      sv:
        "Nehemjas återuppbyggnad av Jerusalems mur (Nehemja 2–6). Spelaren är en judisk arbetare eller vakt. Håll dig till historien: motstånd, bön, enhet, väpnat arbete. Temat: trofasthet, ledarskap, bön och praktiskt arbete för Guds folk.",
      en:
        "Nehemiah's rebuilding of Jerusalem's wall (Nehemiah 2–6). The player is a Jewish worker or guard. Stay historical: opposition, prayer, unity, armed labor. Themes: faithfulness, leadership, prayer and practical work for God's people.",
    },
  },
];

export function getScenario(id: StoryScenarioId): StoryScenario | undefined {
  return STORY_SCENARIOS.find((s) => s.id === id);
}

export function isStoryScenarioId(value: string): value is StoryScenarioId {
  return STORY_SCENARIOS.some((s) => s.id === value);
}
