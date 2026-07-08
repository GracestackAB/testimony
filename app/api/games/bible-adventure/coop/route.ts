import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLocale, isLocale } from "@/lib/i18n/server";
import {
  acceptCoopInvite,
  createCoopInvite,
  declineCoopInvite,
  leaveCoop,
  listCoopInvites,
  listPartnerAdventures,
  resolveUsername,
} from "@/lib/games/bible-adventure/coop-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  try {
    const [invites, partnerGames] = await Promise.all([
      listCoopInvites(user.id),
      listPartnerAdventures(user.id),
    ]);
    return NextResponse.json({ invites, partnerGames });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load co-op data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  let body: {
    action?: string;
    saveId?: string;
    inviteId?: string;
    username?: string;
    locale?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action?.trim();
  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const locale = body.locale && isLocale(body.locale) ? body.locale : await getLocale();

  try {
    if (action === "invite") {
      const saveId = body.saveId?.trim();
      if (!saveId) {
        return NextResponse.json({ error: "Missing saveId" }, { status: 400 });
      }
      let partnerId: string | null = null;
      if (body.username?.trim()) {
        partnerId = await resolveUsername(body.username);
      }
      if (!partnerId) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const result = await createCoopInvite({
        hostId: user.id,
        saveId,
        partnerId,
        locale,
      });
      return NextResponse.json(result);
    }

    if (action === "accept") {
      const inviteId = body.inviteId?.trim();
      if (!inviteId) {
        return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });
      }
      const result = await acceptCoopInvite({ inviteId, userId: user.id });
      return NextResponse.json(result);
    }

    if (action === "decline") {
      const inviteId = body.inviteId?.trim();
      if (!inviteId) {
        return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });
      }
      await declineCoopInvite({ inviteId, userId: user.id });
      return NextResponse.json({ ok: true });
    }

    if (action === "leave") {
      const saveId = body.saveId?.trim();
      if (!saveId) {
        return NextResponse.json({ error: "Missing saveId" }, { status: 400 });
      }
      await leaveCoop({ saveId, userId: user.id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Co-op action failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
