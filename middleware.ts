import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Engelska URL-alias → befintliga svenska routes */
const EN_PATH_ALIASES: Record<string, string> = {
  "/testimonies": "/vittnesbord",
  "/prayer-answers": "/bonesvar",
  "/prayer-requests": "/boneamnen",
  "/gratitude": "/tack",
  "/daily-bible": "/dagens-bibeltext",
  "/ministries": "/plats",
  "/volunteer": "/volontar",
  "/worship": "/lovsang",
  "/network": "/sok",
  "/people": "/sok",
  "/about": "/om",
  "/support": "/stod",
  "/write": "/skriv",
  "/sign-in": "/login",
  "/register": "/registrera",
  "/bible-ai": "/bibel-ai",
  "/messages": "/meddelanden",
  "/feed": "/flode",
  "/my-feed": "/flode",
  "/groups": "/grupper",
  "/communities": "/grupper",
  "/cell-groups": "/cellgrupper",
  "/cell-groups/new": "/cellgrupper/nya",
  "/account": "/konto",
  "/spiritual-journal": "/min-andakt",
  "/my-devotion": "/min-andakt",
  "/games": "/spel",
  "/kids-bible": "/spel/barn",
  "/kids-memory": "/spel/barn-minnes",
  "/kids-story-order": "/spel/barn-ordning",
  "/story-steps": "/spel/barn-ordning",
  "/kids-true-silly": "/spel/barn-sant",
  "/true-or-silly": "/spel/barn-sant",
  "/bible-for-kids": "/spel/barn",
  "/bible-duel": "/spel/bibel-duell",
  "/youth-bible-duel": "/spel/bibel-duell",
  "/bible-quiz": "/spel/bibel-quiz",
  "/verse-puzzle": "/spel/verspussel",
  "/true-false": "/spel/sant-eller-falskt",
  "/memory-pairs": "/spel/minnespar",
  "/parables": "/spel/liknelser",
  "/story-adventure": "/spel/liknelser",
  "/bible-chronicle": "/spel/bibel-aventyr",
  "/bible-adventure": "/spel/bibel-aventyr",
  "/privacy": "/integritet",
  "/terms": "/villkor",
  "/search": "/sok",
  "/forum": "/forum",
};

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  const url = request.nextUrl.clone();
  // Apex utan eget cert — canonical www, men släpp igenom HTTP-validering (DigiCert)
  if (host === "testimony.se" && !url.pathname.startsWith("/.well-known")) {
    const dest = new URL(request.url);
    dest.hostname = "www.testimony.se";
    dest.protocol = "https:";
    dest.port = "";
    return NextResponse.redirect(dest, 301);
  }

  const alias = EN_PATH_ALIASES[url.pathname];
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", alias || url.pathname);

  if (alias) {
    url.pathname = alias;
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "testimony" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
