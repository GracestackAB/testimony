import { NextResponse } from "next/server";
import { getMyConversations, getMyTotalUnreadMessages } from "@/lib/messages/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const [conversations, unread] = await Promise.all([
    getMyConversations(),
    getMyTotalUnreadMessages(),
  ]);
  return NextResponse.json({ conversations, unread_total: unread });
}
