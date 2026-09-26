/** Build a page URL without allowing a request path to replace the site origin. */
export function canonicalUrl(baseUrl: string, pathname: string | null): string {
  const url = new URL(baseUrl);
  url.pathname = pathname?.startsWith("/") ? pathname.split(/[?#]/, 1)[0] : "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}
