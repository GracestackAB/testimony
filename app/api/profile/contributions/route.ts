import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyContributions } from "@/lib/profile/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const data = await getMyContributions(user.id);
  return NextResponse.json(data);
}
