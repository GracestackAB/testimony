import type { Locale } from "@/lib/i18n/types";
import { seedRngFromString, shuffle } from "@/lib/games/bible-quiz";
import { DUEL_TOTAL_QUESTIONS } from "@/lib/games/youth-duel-social";

export type YouthDuelQuestion = {
  id: string;
  promptSv: string;
  promptEn: string;
  optionsSv: [string, string, string, string];
  optionsEn: [string, string, string, string];
  correctIndex: number;
  referenceSv: string;
  referenceEn: string;
  insightSv: string;
  insightEn: string;
};

/** Snabba flervalsfrågor om kända bibelberättelser — för ungdomar. */
export const YOUTH_DUEL_QUESTIONS: YouthDuelQuestion[] = [
  {
    id: "david-goliath",
    promptSv: "Vem besegrade Goliat?",
    promptEn: "Who defeated Goliath?",
    optionsSv: ["David", "Saul", "Samson", "Mose"],
    optionsEn: ["David", "Saul", "Samson", "Moses"],
    correctIndex: 0,
    referenceSv: "1 Sam 17",
    referenceEn: "1 Sam 17",
    insightSv: "David liten men modig — Gud gav honom kraft mot jätten.",
    insightEn: "David was small but brave — God gave him strength against the giant.",
  },
  {
    id: "jonah-fish",
    promptSv: "Vem var inne i den stora fisken?",
    promptEn: "Who was inside the big fish?",
    optionsSv: ["Jona", "Noa", "Petrus", "Paulus"],
    optionsEn: ["Jonah", "Noah", "Peter", "Paul"],
    correctIndex: 0,
    referenceSv: "Jona 1–2",
    referenceEn: "Jonah 1–2",
    insightSv: "Jona lärde sig lyda Gud efter att ha flytt.",
    insightEn: "Jonah learned to obey God after running away.",
  },
  {
    id: "daniel-lions",
    promptSv: "Vilket djur var Daniel med i gropen?",
    promptEn: "Which animal was Daniel with in the pit?",
    optionsSv: ["Lejon", "Björnar", "Ormar", "Vargar"],
    optionsEn: ["Lions", "Bears", "Snakes", "Wolves"],
    correctIndex: 0,
    referenceSv: "Dan 6",
    referenceEn: "Dan 6",
    insightSv: "Gud stängde lejonens gap — Daniel var trygg.",
    insightEn: "God shut the lions' mouths — Daniel was safe.",
  },
  {
    id: "jesus-birth",
    promptSv: "Var föddes Jesus?",
    promptEn: "Where was Jesus born?",
    optionsSv: ["Betlehem", "Jerusalem", "Nasaret", "Rom"],
    optionsEn: ["Bethlehem", "Jerusalem", "Nazareth", "Rome"],
    correctIndex: 0,
    referenceSv: "Luk 2",
    referenceEn: "Luke 2",
    insightSv: "Jesus föddes i Betlehem — profetian gick i uppfyllelse.",
    insightEn: "Jesus was born in Bethlehem — fulfilling prophecy.",
  },
  {
    id: "first-disciples",
    promptSv: "Vad jobbade Petrus och Andreas med?",
    promptEn: "What was Peter and Andrew's job?",
    optionsSv: ["Fiskare", "Skomakare", "Soldater", "Skatteindrivare"],
    optionsEn: ["Fishermen", "Shoemakers", "Soldiers", "Tax collectors"],
    correctIndex: 0,
    referenceSv: "Matt 4",
    referenceEn: "Matt 4",
    insightSv: "Jesus sa: Följ mig — och de lämnade näten.",
    insightEn: "Jesus said: Follow me — and they left their nets.",
  },
  {
    id: "moses-sea",
    promptSv: "Vad gjorde Gud vid Röda havet?",
    promptEn: "What did God do at the Red Sea?",
    optionsSv: ["Delade vattnet", "Tände ett berg", "Skickade regn", "Stängde porten"],
    optionsEn: ["Parted the water", "Lit a mountain", "Sent rain", "Closed a gate"],
    correctIndex: 0,
    referenceSv: "2 Mos 14",
    referenceEn: "Exod 14",
    insightSv: "Folket gick på torr mark — Gud öppnade vägen.",
    insightEn: "The people walked on dry ground — God opened the way.",
  },
  {
    id: "esther",
    promptSv: "Vem gick modigt fram för att rädda sitt folk?",
    promptEn: "Who bravely stepped up to save her people?",
    optionsSv: ["Ester", "Rut", "Maria", "Sara"],
    optionsEn: ["Esther", "Ruth", "Mary", "Sarah"],
    correctIndex: 0,
    referenceSv: "Est 4–8",
    referenceEn: "Est 4–8",
    insightSv: "Ester sa: Om jag går under, går jag under — för mitt folk.",
    insightEn: "Esther said: If I perish, I perish — for my people.",
  },
  {
    id: "paul-conversion",
    promptSv: "Vad hände Paulus på vägen till Damaskus?",
    promptEn: "What happened to Paul on the road to Damascus?",
    optionsSv: ["Jesus uppenbarade sig", "Han föll i sömn", "Han vann ett lopp", "Han byggde en båt"],
    optionsEn: ["Jesus appeared to him", "He fell asleep", "He won a race", "He built a boat"],
    correctIndex: 0,
    referenceSv: "Apg 9",
    referenceEn: "Acts 9",
    insightSv: "Paulus förföljde kyrkan — tills Jesus mötte honom.",
    insightEn: "Paul persecuted the church — until Jesus met him.",
  },
  {
    id: "feeding-5000",
    promptSv: "Vad matade Jesus fem tusen med?",
    promptEn: "What did Jesus feed five thousand with?",
    optionsSv: ["Bröd och fisk", "Pizza", "Druvor", "Kött"],
    optionsEn: ["Bread and fish", "Pizza", "Grapes", "Meat"],
    correctIndex: 0,
    referenceSv: "Joh 6",
    referenceEn: "John 6",
    insightSv: "En pojkes mat räckte till alla — ett under.",
    insightEn: "A boy's lunch was enough for everyone — a miracle.",
  },
  {
    id: "samson",
    promptSv: "Vad gav Samson ovanlig styrka?",
    promptEn: "What gave Samson unusual strength?",
    optionsSv: ["Hans hår", "Hans skor", "Hans svärd", "Hans hatt"],
    optionsEn: ["His hair", "His shoes", "His sword", "His hat"],
    correctIndex: 0,
    referenceSv: "Dom 13–16",
    referenceEn: "Judg 13–16",
    insightSv: "Samson var nasir — satt åt Gud med sitt löfte.",
    insightEn: "Samson was a Nazirite — set apart to God by his vow.",
  },
  {
    id: "ruth",
    promptSv: "Vem sa: Dit du går går jag?",
    promptEn: "Who said: Where you go I will go?",
    optionsSv: ["Rut", "Ester", "Lea", "Rebecka"],
    optionsEn: ["Ruth", "Esther", "Leah", "Rebekah"],
    correctIndex: 0,
    referenceSv: "Rut 1",
    referenceEn: "Ruth 1",
    insightSv: "Rut trofast mot sin svärmor — Gud välsignade henne.",
    insightEn: "Ruth stayed loyal to her mother-in-law — God blessed her.",
  },
  {
    id: "empty-tomb",
    promptSv: "Vad fann kvinnorna vid Jesu grav på påskdagen?",
    promptEn: "What did the women find at Jesus' tomb on Easter?",
    optionsSv: ["Graven var tom", "Guld och silver", "En sovande ängel", "En kung"],
    optionsEn: ["The tomb was empty", "Gold and silver", "A sleeping angel", "A king"],
    correctIndex: 0,
    referenceSv: "Matt 28",
    referenceEn: "Matt 28",
    insightSv: "Jesus uppstod — döden kunde inte hålla honom.",
    insightEn: "Jesus rose — death could not hold him.",
  },
  {
    id: "noah-ark",
    promptSv: "Vem byggde arken?",
    promptEn: "Who built the ark?",
    optionsSv: ["Noa", "Abraham", "Jakob", "Josua"],
    optionsEn: ["Noah", "Abraham", "Jacob", "Joshua"],
    correctIndex: 0,
    referenceSv: "1 Mos 6–9",
    referenceEn: "Gen 6–9",
    insightSv: "Noa trodde Gud — trots att det regnat aldrig förut.",
    insightEn: "Noah trusted God — even though it had never rained before.",
  },
  {
    id: "joseph-coat",
    promptSv: "Vad var speciellt med Josefs kläder?",
    promptEn: "What was special about Joseph's clothes?",
    optionsSv: ["Färggrann kåpa", "Blinkande skor", "Guldkrona", "Röd mantel"],
    optionsEn: ["A colorful coat", "Blinking shoes", "A gold crown", "A red cape"],
    correctIndex: 0,
    referenceSv: "1 Mos 37",
    referenceEn: "Gen 37",
    insightSv: "Bröderna sålde Josef — men Gud hade en plan.",
    insightEn: "His brothers sold Joseph — but God had a plan.",
  },
  {
    id: "zacchaeus",
    promptSv: "Varför klättrade Sakkeus upp i ett träd?",
    promptEn: "Why did Zacchaeus climb a tree?",
    optionsSv: ["För att se Jesus", "För att plocka frukt", "För att fly", "För att sova"],
    optionsEn: ["To see Jesus", "To pick fruit", "To escape", "To sleep"],
    correctIndex: 0,
    referenceSv: "Luk 19",
    referenceEn: "Luke 19",
    insightSv: "Jesus såg honom och blev hans vän.",
    insightEn: "Jesus saw him and became his friend.",
  },
  {
    id: "elijah-rain",
    promptSv: "Vem bad om regn efter torka på Karmel?",
    promptEn: "Who prayed for rain after drought on Carmel?",
    optionsSv: ["Elia", "Eliseus", "Samuel", "Jeremia"],
    optionsEn: ["Elijah", "Elisha", "Samuel", "Jeremiah"],
    correctIndex: 0,
    referenceSv: "1 Kung 18",
    referenceEn: "1 Kings 18",
    insightSv: "Elia visade att Gud är den levande Guden.",
    insightEn: "Elijah showed that God is the living God.",
  },
  {
    id: "timothy",
    promptSv: "Vem var Timoteus för Paulus?",
    promptEn: "Who was Timothy to Paul?",
    optionsSv: ["Ung medarbetare", "Kejsare", "Fiende", "Far"],
    optionsEn: ["Young coworker", "Emperor", "Enemy", "Father"],
    correctIndex: 0,
    referenceSv: "1 Tim 1",
    referenceEn: "1 Tim 1",
    insightSv: "Paulus uppmuntrade Timoteus: var inte rädd!",
    insightEn: "Paul urged Timothy: don't be afraid!",
  },
  {
    id: "jericho",
    promptSv: "Hur föll Jerikos murar?",
    promptEn: "How did the walls of Jericho fall?",
    optionsSv: ["Med trumpeter och marsch", "Med en stor hammare", "Med eld", "Med en storm"],
    optionsEn: ["With trumpets and marching", "With a big hammer", "With fire", "With a storm"],
    correctIndex: 0,
    referenceSv: "Jos 6",
    referenceEn: "Josh 6",
    insightSv: "Folket lydde Gud — och murarna rasade.",
    insightEn: "The people obeyed God — and the walls fell.",
  },
  {
    id: "mary-magdalene",
    promptSv: "Vem var först att se den uppståndne Jesus?",
    promptEn: "Who was first to see the risen Jesus?",
    optionsSv: ["Maria Magdalena", "Petrus", "Pilatus", "Judas"],
    optionsEn: ["Mary Magdalene", "Peter", "Pilate", "Judas"],
    correctIndex: 0,
    referenceSv: "Joh 20",
    referenceEn: "John 20",
    insightSv: "Jesus visade sig för en trogen kvinna först.",
    insightEn: "Jesus appeared first to a faithful woman.",
  },
  {
    id: "abraham",
    promptSv: "Vad lovade Gud Abraham?",
    promptEn: "What did God promise Abraham?",
    optionsSv: ["Ett stort släkte", "Ett slott i Rom", "En guldgruva", "En flotta"],
    optionsEn: ["A great nation", "A castle in Rome", "A gold mine", "A fleet"],
    correctIndex: 0,
    referenceSv: "1 Mos 12",
    referenceEn: "Gen 12",
    insightSv: "Abraham trodde Gud — och gick när han kallades.",
    insightEn: "Abraham believed God — and went when called.",
  },
];

export function questionPrompt(q: YouthDuelQuestion, locale: Locale): string {
  return locale === "en" ? q.promptEn : q.promptSv;
}

export function questionOptions(q: YouthDuelQuestion, locale: Locale): string[] {
  return locale === "en" ? [...q.optionsEn] : [...q.optionsSv];
}

export function questionReference(q: YouthDuelQuestion, locale: Locale): string {
  return locale === "en" ? q.referenceEn : q.referenceSv;
}

export function questionInsight(q: YouthDuelQuestion, locale: Locale): string {
  return locale === "en" ? q.insightEn : q.insightSv;
}

export function buildYouthDuel(
  count = DUEL_TOTAL_QUESTIONS,
  locale: Locale = "sv",
  rng: () => number = Math.random
): YouthDuelQuestion[] {
  void locale;
  return shuffle(YOUTH_DUEL_QUESTIONS, rng).slice(0, Math.min(count, YOUTH_DUEL_QUESTIONS.length));
}

export function buildYouthDuelWithSeed(
  count: number,
  locale: Locale,
  seed: string
): YouthDuelQuestion[] {
  return buildYouthDuel(count, locale, seedRngFromString(seed));
}

export function isYouthDuelCorrect(question: YouthDuelQuestion, optionIndex: number): boolean {
  return optionIndex === question.correctIndex;
}
