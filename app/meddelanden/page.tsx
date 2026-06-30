import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyConversations } from "@/lib/messages/server";
import { Avatar } from "@/components/profile/Avatar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meddelanden",
  description: "Direktmeddelanden mellan användare på testimony.se",
};

function timeAgo(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return "nu";
  if (diff < hour) return `${Math.floor(diff / min)} min`;
  if (diff < day) return `${Math.floor(diff / hour)} h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} d`;
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meddelanden");

  const conversations = await getMyConversations();

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900">Meddelanden</h1>
        <p className="text-sm text-stone-600 mt-1">
          Direktmeddelanden med andra användare. Var ett vittne och en uppmuntran.
        </p>
      </header>

      {conversations.length === 0 ? (
        <div className="border border-stone-200 rounded-lg bg-parchment p-10 text-center">
          <div className="text-5xl mb-3 opacity-40">✉️</div>
          <p className="text-stone-700 mb-1 font-medium">Inga konversationer ännu.</p>
          <p className="text-sm text-stone-500">
            Besök en profil och tryck på <span className="font-medium">Skicka meddelande</span> för att börja.
          </p>
        </div>
      ) : (
        <ul className="border border-stone-200 rounded-lg overflow-hidden bg-parchment divide-y divide-stone-200">
          {conversations.map((c) => {
            const name = c.other.display_name ?? c.other.username ?? "Användare";
            const isUnread = c.unread_count > 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/meddelanden/${c.id}`}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-stone-50 transition-colors ${
                    isUnread ? "bg-olive-50/40" : ""
                  }`}
                >
                  <Avatar src={c.other.avatar_url} name={name} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate ${
                          isUnread ? "font-semibold text-stone-900" : "text-stone-800"
                        }`}
                      >
                        {name}
                      </span>
                      <span className="text-xs text-stone-500 flex-shrink-0">
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p
                        className={`text-sm truncate flex-1 ${
                          isUnread ? "text-stone-800" : "text-stone-500"
                        }`}
                      >
                        {c.last_message_preview ?? <em>Ingen text</em>}
                      </p>
                      {isUnread && (
                        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center flex-shrink-0">
                          {c.unread_count > 99 ? "99+" : c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
