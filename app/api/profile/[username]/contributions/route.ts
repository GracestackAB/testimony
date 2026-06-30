import { NextResponse } from "next/server";
import { getPublicProfileByUsername, getPublicContributionsByAuthor } from "@/lib/profile/server";

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const data = await getPublicContributionsByAuthor(profile.id);
  return NextResponse.json(data);
}
