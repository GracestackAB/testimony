/** Canonical production URL (prefer www — matches Loopia DNS). */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://www.testimony.se";
  return raw.replace(/\/$/, "");
}

export const ORG = {
  name: "testimony.se",
  legalName: "Gracestack AB",
  url: siteUrl(),
  logo: `${siteUrl()}/icon-512.png`,
  email: "gracestackab@gmail.com",
} as const;
