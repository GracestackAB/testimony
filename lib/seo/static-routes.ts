export type SitemapEntry = {
  path: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
};

/** Publika statiska sidor — uppdatera när nya features lanseras. */
export const STATIC_SITEMAP_ROUTES: SitemapEntry[] = [
  { path: "/", changeFrequency: "hourly", priority: 1 },
  { path: "/vittnesbord", changeFrequency: "hourly", priority: 0.9 },
  { path: "/bonesvar", changeFrequency: "hourly", priority: 0.85 },
  { path: "/boneamnen", changeFrequency: "hourly", priority: 0.85 },
  { path: "/tack", changeFrequency: "daily", priority: 0.75 },
  { path: "/dagens-bibeltext", changeFrequency: "daily", priority: 0.9 },
  { path: "/bibel-ai", changeFrequency: "weekly", priority: 0.85 },
  { path: "/spel", changeFrequency: "weekly", priority: 0.8 },
  { path: "/spel/barn", changeFrequency: "weekly", priority: 0.8 },
  { path: "/spel/barn-minnes", changeFrequency: "weekly", priority: 0.8 },
  { path: "/spel/barn-ordning", changeFrequency: "weekly", priority: 0.8 },
  { path: "/spel/barn-sant", changeFrequency: "weekly", priority: 0.8 },
  { path: "/spel/bibel-duell", changeFrequency: "weekly", priority: 0.8 },
  { path: "/spel/bibel-aventyr", changeFrequency: "weekly", priority: 0.75 },
  { path: "/spel/bibel-quiz", changeFrequency: "weekly", priority: 0.75 },
  { path: "/spel/verspussel", changeFrequency: "weekly", priority: 0.75 },
  { path: "/spel/sant-eller-falskt", changeFrequency: "weekly", priority: 0.75 },
  { path: "/spel/minnespar", changeFrequency: "weekly", priority: 0.75 },
  { path: "/spel/liknelser", changeFrequency: "weekly", priority: 0.7 },
  { path: "/plats", changeFrequency: "daily", priority: 0.8 },
  { path: "/volontar", changeFrequency: "daily", priority: 0.75 },
  { path: "/lovsang", changeFrequency: "daily", priority: 0.7 },
  { path: "/forum", changeFrequency: "daily", priority: 0.7 },
  { path: "/sok", changeFrequency: "weekly", priority: 0.65 },
  { path: "/flode", changeFrequency: "daily", priority: 0.6 },
  { path: "/grupper", changeFrequency: "weekly", priority: 0.6 },
  { path: "/skriv", changeFrequency: "monthly", priority: 0.55 },
  { path: "/om", changeFrequency: "monthly", priority: 0.5 },
  { path: "/stod", changeFrequency: "monthly", priority: 0.45 },
  { path: "/integritet", changeFrequency: "yearly", priority: 0.3 },
  { path: "/villkor", changeFrequency: "yearly", priority: 0.3 },
  { path: "/registrera", changeFrequency: "monthly", priority: 0.4 },
  { path: "/login", changeFrequency: "monthly", priority: 0.35 },
];
