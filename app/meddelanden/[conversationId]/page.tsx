import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getConversationWithOther,
  getMessagesForConversation,
} from "@/lib/messages/server";
import { MessageThread } from "@/components/messages/MessageThread";

export const dynamic = "force-dynamic";

type Params = { conversationId: string };

export const metadata = {
  title: "Konversation",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/meddelanden/${conversationId}`);

  const { conversation, other, isParticipant, myUserId } = await getConversationWithOther(conversationId);
  if (!conversation) notFound();
  if (!isParticipant || !other || !myUserId) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10">
        <p className="text-stone-700">Du har inte tillgång till denna konversation.</p>
        <Link href="/meddelanden" className="text-olive-700 hover:underline text-sm mt-2 inline-block">
          ← Tillbaka till inkorgen
        </Link>
      </div>
    );
  }

  const messages = await getMessagesForConversation(conversationId, 200);

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      <Link
        href="/meddelanden"
        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Inkorg
      </Link>

      <MessageThread
        conversationId={conversationId}
        myUserId={myUserId}
        initialMessages={messages}
        other={other}
      />
    </div>
  );
}
