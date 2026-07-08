import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { getUserOrgs } from "@/lib/org-admin";
import { Avatar } from "@/components/profile/Avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getMyUnreadCount } from "@/lib/notifications/server";
import { getMyTotalUnreadMessages } from "@/lib/messages/server";
import { getPendingDailyBibleCount } from "@/lib/bible/admin";

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isModerator = false;
  let pendingCount = 0;
  let userOrgs: { slug: string; name: string }[] = [];
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_moderator, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    isModerator = Boolean(data?.is_moderator);
    displayName = data?.display_name ?? null;
    avatarUrl = data?.avatar_url ?? null;
    if (isModerator) {
      const [{ count }, pendingBible] = await Promise.all([
        supabase
          .from("moderation_queue")
          .select("id", { count: "exact", head: true })
          .is("reviewed_at", null),
        getPendingDailyBibleCount(),
      ]);
      pendingCount = (count ?? 0) + pendingBible;
    }
    const orgs = await getUserOrgs(user.id);
    userOrgs = orgs.map(o => ({ slug: o.slug, name: o.name }));
  }

  const unreadNotifications = user ? await getMyUnreadCount() : 0;
  const unreadMessages = user ? await getMyTotalUnreadMessages() : 0;

  return (
    <header className="safe-top border-b border-stone-200 bg-parchment/90 backdrop-blur sticky top-0 z-40">
      <div className="safe-x max-w-6xl mx-auto py-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {isModerator && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900 text-parchment text-xs font-medium hover:bg-stone-800 transition-colors"
              aria-label={`Admin${pendingCount > 0 ? `, ${pendingCount} att granska` : ""}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"/></svg>
              Admin
              {pendingCount > 0 && (
                <span className="ml-0.5 bg-amber-400 text-stone-900 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/sok"
            aria-label="Sök profiler"
            className="p-2 -m-2 text-stone-700 hover:text-stone-900 rounded-lg transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </Link>
          {user && (
            <Link
              href="/meddelanden"
              aria-label={`Meddelanden${unreadMessages > 0 ? ` (${unreadMessages} olästa)` : ""}`}
              className="relative p-2 -m-2 text-stone-700 hover:text-stone-900 rounded-lg transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {unreadMessages > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Link>
          )}
          {user && <NotificationBell initialUnread={unreadNotifications} />}
          {user && (
            <Link
              href="/konto"
              className="hidden sm:inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-stone-300 bg-stone-50 hover:bg-stone-100 text-sm font-medium text-stone-800 transition-colors"
              aria-label="Min profil"
            >
              <Avatar src={avatarUrl} name={displayName ?? user.email ?? null} size={28} />
              <span className="max-w-[140px] truncate">
                {displayName ?? "Min profil"}
              </span>
            </Link>
          )}
          <MobileMenu
            user={user ? { email: user.email, displayName, avatarUrl } : null}
            isModerator={isModerator}
            pendingCount={pendingCount}
            userOrgs={userOrgs}
          />
        </div>
      </div>
    </header>
  );
}
