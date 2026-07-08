import type { Locale } from "@/lib/i18n/types";
import type { AdventureChoice } from "./state";

export type AdventureScenarioId =
  | "elijah_carmel"
  | "esther_palace"
  | "joseph_pit"
  | "cleopas_road";

export type AdventureScenario = {
  id: AdventureScenarioId;
  emoji: string;
  bibleRef: Record<Locale, string>;
  title: Record<Locale, string>;
  tagline: Record<Locale, string>;
  startLocation: Record<Locale, string>;
  opening: Record<Locale, string>;
  startingItems: string[];
  initialChoices: Record<Locale, AdventureChoice[]>;
  aiBrief: Record<Locale, string>;
};

const COMMON_START = ["travel_cloak", "scripture_scroll", "waterskin"];

export const ADVENTURE_SCENARIOS: AdventureScenario[] = [
  {
    id: "elijah_carmel",
    emoji: "🔥",
    bibleRef: { sv: "1 Kung 18", en: "1 Kings 18" },
    title: { sv: "Elias på Karmel", en: "Elijah on Mount Carmel" },
    tagline: {
      sv: "En profet ensam mot Baals präster — och ett folk som vacklar.",
      en: "One prophet against Baal's priests — and a wavering people.",
    },
    startLocation: { sv: "Karmels berg", en: "Mount Carmel" },
    opening: {
      sv:
        "Dimman drar in över Karmel. Fyrahundra femtio Baals präster har samlats; kungen och folket väntar. Du bär profetens mantel — Herren har sagt att det ska regna, men himlen är stum. Elden ska falla. Frågan är hur du förbereder ditt hjärta innan striden börjar.",
      en:
        "Mist rolls over Carmel. Four hundred fifty priests of Baal have gathered; the king and the people wait. You wear the prophet's mantle — the Lord said rain would come, but heaven is silent. Fire must fall. The question is how you prepare your heart before the contest begins.",
    },
    startingItems: [...COMMON_START, "oil_lamp"],
    initialChoices: {
      sv: [
        { id: "pray_alone", label: "Gå undan och be ensam innan du träder fram" },
        { id: "confront_ahab", label: "Gå direkt till Ahab och påminn om Herrens ord" },
        {
          id: "read_scroll",
          label: "Läs ur skriftrullen för att stärka ditt mod",
          requiresItem: "scripture_scroll",
        },
      ],
      en: [
        { id: "pray_alone", label: "Withdraw to pray alone before stepping forward" },
        { id: "confront_ahab", label: "Go straight to Ahab and remind him of the Lord's word" },
        {
          id: "read_scroll",
          label: "Read from the scroll to strengthen your courage",
          requiresItem: "scripture_scroll",
        },
      ],
    },
    aiBrief: {
      sv:
        "1 Kung 18. Spelaren är Elias på Karmel inför eldprovet mot Baals präster. Biblisk trohet: Herren är den ende sanne Guden. Teman: mod, bön, Herrens trofasthet. Håll dig till forntida Israel — inga moderna element.",
      en:
        "1 Kings 18. The player is Elijah on Carmel before the fire contest with Baal's priests. Biblical faithfulness: the Lord alone is the true God. Themes: courage, prayer, the Lord's faithfulness. Stay in ancient Israel — no modern elements.",
    },
  },
  {
    id: "esther_palace",
    emoji: "👑",
    bibleRef: { sv: "Ester 4–8", en: "Esther 4–8" },
    title: { sv: "Ester inför kungen", en: "Esther before the King" },
    tagline: {
      sv: "Palatset är vackert — och dödligt för ditt folk.",
      en: "The palace is beautiful — and deadly for your people.",
    },
    startLocation: { sv: "Susans palats", en: "The palace at Susa" },
    opening: {
      sv:
        "Du är drottning Ester. Mordekai har meddelat Hamans onda plan: judarna ska utrotas. Fastan är slut. Du står vid dörren till den inre gården — utan kallelse väntar döden. Men ditt folk väntar också. I ditt rum ligger signetringen du sällan bär.",
      en:
        "You are Queen Esther. Mordecai has told you of Haman's evil plot: the Jews are to be destroyed. The fast has ended. You stand at the door to the inner court — without summons, death awaits. But your people wait too. In your chamber lies the signet ring you rarely wear.",
    },
    startingItems: [...COMMON_START, "seal_ring"],
    initialChoices: {
      sv: [
        { id: "fast_pray", label: "Be en sista bön innan du går in" },
        { id: "send_mordecai", label: "Skicka bud till Mordekai om din rädsla" },
        {
          id: "wear_ring",
          label: "Ta på signetringen och gå med kunglig värdighet",
          requiresItem: "seal_ring",
        },
      ],
      en: [
        { id: "fast_pray", label: "Pray one last prayer before you enter" },
        { id: "send_mordecai", label: "Send word to Mordecai about your fear" },
        {
          id: "wear_ring",
          label: "Put on the signet ring and go with royal dignity",
          requiresItem: "seal_ring",
        },
      ],
    },
    aiBrief: {
      sv:
        "Ester 4–8. Spelaren är Ester inför risken att gå in till kungen. Teman: mod, fasta, Guds osynliga providens ('för en tid som denna'). Haman, Xerxes, Mordekai. Ingen våldsglorifiering utöver bibelns berättelse.",
      en:
        "Esther 4–8. The player is Esther facing the risk of approaching the king. Themes: courage, fasting, God's hidden providence ('for such a time as this'). Haman, Xerxes, Mordecai. No glorification of violence beyond the biblical account.",
    },
  },
  {
    id: "joseph_pit",
    emoji: "⛓️",
    bibleRef: { sv: "1 Mos 37–45", en: "Gen 37–45" },
    title: { sv: "Josefs väg", en: "Joseph's Road" },
    tagline: {
      sv: "Från brunnen i Dothan till Faraos tron — trogenhet i mörker.",
      en: "From the pit at Dothan to Pharaoh's throne — faithfulness in the dark.",
    },
    startLocation: { sv: "Dothans öken", en: "The wilderness near Dothan" },
    opening: {
      sv:
        "Dina bröder har sålt dig till ismaeliterna. Repen skär i handlederna; dammet täcker dina läppar. Du hade drömmar om sheaves som böjde sig — nu böjer du dig själv under slavens ok. Men Herren var med dig i faderns hus. Är Han med dig här?",
      en:
        "Your brothers have sold you to Ishmaelites. Ropes bite your wrists; dust covers your lips. You dreamed of sheaves bowing down — now you bow under a slave's yoke. Yet the Lord was with you in your father's house. Is He with you here?",
    },
    startingItems: [...COMMON_START, "staff"],
    initialChoices: {
      sv: [
        { id: "pray_desert", label: "Be tyst i ökenvinden" },
        { id: "appeal_brothers", label: "Vänd dig till bröderna en sista gång" },
        {
          id: "lean_staff",
          label: "Stöd dig på staven och gå med värdighet",
          requiresItem: "staff",
        },
      ],
      en: [
        { id: "pray_desert", label: "Pray quietly in the desert wind" },
        { id: "appeal_brothers", label: "Turn to your brothers one last time" },
        {
          id: "lean_staff",
          label: "Lean on the staff and walk with dignity",
          requiresItem: "staff",
        },
      ],
    },
    aiBrief: {
      sv:
        "1 Mos 37–45 (fokus tidig del: såld slav, Potifars hus, fängelse). Spelaren är Josef. Teman: förräderi, trofasthet, Guds suveränitet i lidande. Ingen hämndfantasi — bibelns narrativ styr.",
      en:
        "Genesis 37–45 (early focus: sold as slave, Potiphar's house, prison). The player is Joseph. Themes: betrayal, integrity, God's sovereignty in suffering. No revenge fantasy — the biblical narrative governs.",
    },
  },
  {
    id: "cleopas_road",
    emoji: "🌅",
    bibleRef: { sv: "Lukas 24:13–35", en: "Luke 24:13–35" },
    title: { sv: "Vägen till Emmaus", en: "The Road to Emmaus" },
    tagline: {
      sv: "Två förlorade hjärtan — och en främling som går bredvid.",
      en: "Two downcast hearts — and a stranger walking beside.",
    },
    startLocation: { sv: "Vägen till Emmaus", en: "The road to Emmaus" },
    opening: {
      sv:
        "Det är sent på eftermiddagen den tredje dagen. Jerusalem ligger bakom er — tomma gravar och förkrossade hopp. Du och Kleopas går mot Emmaus, sju mil bort. En främling närmar sig. Han frågar varför ni ser så bedrövade ut. Brödet i din packning är knappt nog för en måltid.",
      en:
        "It is late afternoon on the third day. Jerusalem lies behind you — empty tombs and shattered hope. You and Cleopas walk toward Emmaus, seven miles away. A stranger draws near. He asks why you look so downcast. The bread in your pack is barely enough for one meal.",
    },
    startingItems: [...COMMON_START, "bread"],
    initialChoices: {
      sv: [
        { id: "tell_story", label: "Berätta för främlingen allt som hänt i Jerusalem" },
        { id: "walk_silent", label: "Fortsätt tyst — du orkar inte förklara" },
        {
          id: "offer_bread",
          label: "Bjud främlingen på bröd när ni stannar",
          requiresItem: "bread",
          consumesItem: true,
        },
      ],
      en: [
        { id: "tell_story", label: "Tell the stranger everything that happened in Jerusalem" },
        { id: "walk_silent", label: "Keep walking in silence — you cannot bear to explain" },
        {
          id: "offer_bread",
          label: "Offer the stranger bread when you stop to rest",
          requiresItem: "bread",
          consumesItem: true,
        },
      ],
    },
    aiBrief: {
      sv:
        "Lukas 24:13–35. Spelaren är en lärjunge med Kleopas på vägen till Emmaus. Den uppståndne Jesus kan vara 'främlingen' utan att avslöjas för tidigt. Teman: sorg, Skriftens förklaring, igenkänning vid brödsbrytelsen. Håll nytestamentlig trohet.",
      en:
        "Luke 24:13–35. The player is a disciple with Cleopas on the road to Emmaus. The risen Jesus may be 'the stranger' without being revealed too early. Themes: grief, Scripture explained, recognition at the breaking of bread. Maintain New Testament faithfulness.",
    },
  },
];

const SCENARIO_MAP = new Map(ADVENTURE_SCENARIOS.map((s) => [s.id, s]));

export function getAdventureScenario(id: AdventureScenarioId): AdventureScenario | undefined {
  return SCENARIO_MAP.get(id);
}

export function isAdventureScenarioId(id: string): id is AdventureScenarioId {
  return SCENARIO_MAP.has(id as AdventureScenarioId);
}
