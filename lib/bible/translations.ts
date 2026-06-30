/** HelloAO / Free Use Bible API — kuraterade översättningar för RAG (public domain). */

export type RagTranslation = {
  id: string;
  language: "sv" | "en" | "he" | "el";
  label: string;
  license: string;
};

/** Fyra lager: svensk, engelsk, hebreiska (GT), grekiska (NT). */
export const RAG_TRANSLATIONS: RagTranslation[] = [
  {
    id: "swe_fol",
    language: "sv",
    label: "Svenska Folkbibeln",
    license: "Public domain (ebible.org)",
  },
  {
    id: "BSB",
    language: "en",
    label: "Berean Standard Bible",
    license: "Public domain",
  },
  {
    id: "HBOMAS",
    language: "he",
    label: "Hebrew Masoretic OT",
    license: "Public domain (ebible.org)",
  },
  {
    id: "grc_sbl",
    language: "el",
    label: "SBL Greek New Testament",
    license: "Creative Commons",
  },
];

export const HELLOAO_API_BASE = "https://bible.helloao.org";

export function getRagTranslation(id: string): RagTranslation | undefined {
  return RAG_TRANSLATIONS.find((t) => t.id === id);
}
