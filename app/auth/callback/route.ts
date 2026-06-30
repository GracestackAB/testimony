import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.testimony.se").replace(/\/$/, "");
  const loginUrl = new URL("/login", siteBase);

  const oauthError = searchParams.get("error");
  const oauthDesc = searchParams.get("error_description");
  if (oauthError) {
    loginUrl.searchParams.set("error", oauthDesc || oauthError);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  const dest = next.startsWith("/") ? next : `/${next}`;
  return NextResponse.redirect(`${siteBase}${dest}`);
}
