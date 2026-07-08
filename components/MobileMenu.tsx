"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/profile/Avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useDict } from "@/lib/i18n/client";

type MenuProps = {
  user: {
    email?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  isModerator: boolean;
  pendingCount?: number;
  userOrgs?: { slug: string; name: string }[];
};

type NavItem = {
  href: string;
  label: string;
  kicker: string;
  icon: React.ReactNode;
};

const ICON_BASE = "w-5 h-5 flex-shrink-0";

function navIcon(path: string) {
  switch (path) {
    case "/vittnesbord":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h12l4 4v12a0 0 0 0 1 0 0H4a0 0 0 0 1 0 0V4z" />
          <path d="M8 10h8M8 14h8M8 18h5" />
        </svg>
      );
    case "/bonesvar":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "/boneamnen":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" />
        </svg>
      );
    case "/tack":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "/dagens-bibeltext":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18z" />
          <path d="M12 6v10M9 9h6" />
        </svg>
      );
    case "/bibel-ai":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4v6c0 5-3.5 9-8 10C7.5 22 4 18 4 13V7l8-4z" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      );
    case "/spel":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 9h.01M15 9h.01M9.5 15a3.5 3.5 0 0 0 5 0" />
        </svg>
      );
    case "/plats":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "/lovsang":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "/flode":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11h16M4 6h10M4 16h7" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "/grupper":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "/sok":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87M17 3.13A4 4 0 0 1 17 11" />
        </svg>
      );
    case "/forum":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "/volontar":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87M17 3.13A4 4 0 0 1 17 11" />
        </svg>
      );
    case "/stod":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v8M9 11h6M4 6h16v12H4z" />
        </svg>
      );
    case "/om":
      return (
        <svg className={ICON_BASE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
      );
    default:
      return null;
  }
}

export function MobileMenu({ user, isModerator, pendingCount = 0, userOrgs = [] }: MenuProps) {
  const dict = useDict();
  const n = dict.nav;
  const m = dict.menu;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = useMemo<NavItem[]>(
    () => [
      { href: "/vittnesbord", label: n.testimonies, kicker: n.testimoniesKicker, icon: navIcon("/vittnesbord") },
      { href: "/bonesvar", label: n.prayerAnswers, kicker: n.prayerAnswersKicker, icon: navIcon("/bonesvar") },
      { href: "/boneamnen", label: n.prayerRequests, kicker: n.prayerRequestsKicker, icon: navIcon("/boneamnen") },
      { href: "/tack", label: n.gratitude, kicker: n.gratitudeKicker, icon: navIcon("/tack") },
      { href: "/dagens-bibeltext", label: n.dailyBible, kicker: n.dailyBibleKicker, icon: navIcon("/dagens-bibeltext") },
      { href: "/bibel-ai", label: n.bibleAi, kicker: n.bibleAiKicker, icon: navIcon("/bibel-ai") },
      { href: "/spel", label: n.games, kicker: n.gamesKicker, icon: navIcon("/spel") },
      { href: "/plats", label: n.places, kicker: n.placesKicker, icon: navIcon("/plats") },
      { href: "/lovsang", label: n.worship, kicker: n.worshipKicker, icon: navIcon("/lovsang") },
      { href: "/flode", label: n.myFeed, kicker: n.myFeedKicker, icon: navIcon("/flode") },
      { href: "/grupper", label: n.groups, kicker: n.groupsKicker, icon: navIcon("/grupper") },
      { href: "/sok", label: n.network, kicker: n.networkKicker, icon: navIcon("/sok") },
      { href: "/forum", label: n.forum, kicker: n.forumKicker, icon: navIcon("/forum") },
      { href: "/volontar", label: n.volunteer, kicker: n.volunteerKicker, icon: navIcon("/volontar") },
      { href: "/stod", label: n.support, kicker: n.supportKicker, icon: navIcon("/stod") },
      { href: "/om", label: n.about, kicker: n.aboutKicker, icon: navIcon("/om") },
    ],
    [n]
  );

  const adminNav = useMemo(
    () => [
      { href: "/admin", ...m.adminNav.overview, badge: false },
      { href: "/admin/moderation", ...m.adminNav.moderation, badge: true },
      { href: "/admin/bibeltexter", ...m.adminNav.dailyBible, badge: false },
      { href: "/admin/anvandare", ...m.adminNav.users, badge: false },
      { href: "/admin/vittnesbord", ...m.adminNav.testimonies, badge: false },
      { href: "/admin/boneamnen", ...m.adminNav.prayerRequests, badge: false },
      { href: "/admin/bonesvar", ...m.adminNav.prayerAnswers, badge: false },
      { href: "/admin/tack", ...m.adminNav.gratitude, badge: false },
      { href: "/admin/verksamheter", ...m.adminNav.ministries, badge: false },
      { href: "/admin/volontar", ...m.adminNav.volunteer, badge: false },
    ],
    [m.adminNav]
  );

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? m.close : m.open}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="relative p-2 -m-2 text-stone-800 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600/50 rounded-lg transition-colors"
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center gap-[5px]">
          <span className={`block h-[2px] w-6 bg-current rounded transition-all duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`block h-[2px] w-6 bg-current rounded transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`} />
          <span className={`block h-[2px] w-6 bg-current rounded transition-all duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </div>
      </button>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      />

      {/* Panel - flex-layout så nav alltid syns mellan header och footer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-[100dvh] w-full max-w-sm bg-parchment shadow-2xl border-l border-stone-200 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
        aria-label={m.mainNav}
      >
        {/* Header */}
        <div className="safe-top flex items-center justify-between px-6 py-5 border-b border-stone-200 flex-shrink-0">
          <Link href="/" className="font-serif text-lg font-semibold text-stone-900">
            testimony<span className="text-olive-600">.se</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setOpen(false)}
              aria-label={m.close}
              className="p-2 -m-2 text-stone-500 hover:text-stone-900 rounded-lg focus-visible:ring-2 focus-visible:ring-olive-600/50"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={n.menu}>
          {user && (
            <div className="mb-5 px-1">
              <div className="px-3 pb-2">
                <span className="text-[10px] uppercase tracking-[0.15em] text-olive-700 font-semibold">
                  {m.myAccount}
                </span>
              </div>
              <Link
                href="/konto"
                className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                  pathname.startsWith("/konto")
                    ? "border-olive-300 bg-olive-50"
                    : "border-stone-200 bg-parchment hover:bg-stone-50"
                }`}
              >
                <Avatar src={user.avatarUrl ?? null} name={user.displayName ?? user.email ?? null} size={44} />
                <span className="flex-1 min-w-0">
                  <span className="block font-serif text-base font-semibold text-stone-900 truncate">
                    {user.displayName ?? m.myProfile}
                  </span>
                  <span className="block text-xs text-stone-500 truncate">
                    {m.viewEditProfile}
                  </span>
                </span>
                <span className="text-olive-700">→</span>
              </Link>
              <Link
                href="/sok"
                className={`mt-2 flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                  pathname.startsWith("/sok")
                    ? "border-olive-300 bg-olive-50"
                    : "border-stone-200 bg-parchment hover:bg-stone-50"
                }`}
              >
                <span className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-serif text-base font-semibold text-stone-900 truncate">
                    {m.searchProfiles}
                  </span>
                  <span className="block text-xs text-stone-500 truncate">
                    {m.findUsers}
                  </span>
                </span>
                <span className="text-olive-700">→</span>
              </Link>
              <Link
                href="/meddelanden"
                className={`mt-2 flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                  pathname.startsWith("/meddelanden")
                    ? "border-olive-300 bg-olive-50"
                    : "border-stone-200 bg-parchment hover:bg-stone-50"
                }`}
              >
                <span className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-serif text-base font-semibold text-stone-900 truncate">
                    {n.messages}
                  </span>
                  <span className="block text-xs text-stone-500 truncate">
                    {m.directMessages}
                  </span>
                </span>
                <span className="text-olive-700">→</span>
              </Link>
              <Link
                href="/min-andakt"
                className={`mt-2 flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                  pathname.startsWith("/min-andakt")
                    ? "border-olive-300 bg-olive-50"
                    : "border-stone-200 bg-parchment hover:bg-stone-50"
                }`}
              >
                <span className="w-11 h-11 rounded-full bg-olive-100 flex items-center justify-center text-lg">
                  🕊️
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-serif text-base font-semibold text-stone-900 truncate">
                    {n.spiritualJournal}
                  </span>
                  <span className="block text-xs text-stone-500 truncate">
                    {n.spiritualJournalKicker}
                  </span>
                </span>
                <span className="text-olive-700">→</span>
              </Link>
            </div>
          )}

          {isModerator && (
            <div className="mb-5 px-1">
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-amber-700 font-semibold">
                    {m.admin}
                  </span>
                  {pendingCount > 0 && (
                    <span className="bg-amber-400 text-stone-900 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {m.pendingCount.replace("{n}", String(pendingCount))}
                    </span>
                  )}
                </div>
              </div>
              <ul className="space-y-0.5 rounded-xl bg-gradient-to-br from-amber-50 to-stone-50 border border-amber-100 p-2">
                {adminNav.map(item => {
                  const active = pathname === item.href;
                  const showBadge = item.badge && pendingCount > 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-white text-stone-900 font-medium shadow-sm"
                            : "text-stone-700 hover:bg-white/60"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block text-[9px] uppercase tracking-[0.12em] text-stone-500">
                            {item.kicker}
                          </span>
                          <span className="block">{item.label}</span>
                        </span>
                        {showBadge && (
                          <span className="shrink-0 bg-amber-400 text-stone-900 text-[10px] font-bold rounded-full px-2 py-0.5 leading-none">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 mb-1 px-3 text-[10px] uppercase tracking-[0.15em] text-stone-500">
                {m.theSite}
              </div>
            </div>
          )}

          {userOrgs.length > 0 && (
            <div className="mb-5 px-1">
              <div className="flex items-center gap-2 px-3 pb-2">
                <span className="text-[10px] uppercase tracking-[0.15em] text-olive-700 font-semibold">
                  {m.myMinistry}
                </span>
              </div>
              <ul className="space-y-0.5 rounded-xl bg-gradient-to-br from-olive-50 to-stone-50 border border-olive-100 p-2">
                {userOrgs.map(o => {
                  const href = `/min-verksamhet/${o.slug}`;
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={o.slug}>
                      <Link
                        href={href}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          active ? "bg-white text-stone-900 font-medium shadow-sm" : "text-stone-700 hover:bg-white/60"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block text-[9px] uppercase tracking-[0.12em] text-stone-500">
                            {m.manage}
                          </span>
                          <span className="block truncate">{o.name}</span>
                        </span>
                        <span className="shrink-0 text-olive-700">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {!isModerator && (
                <div className="mt-3 mb-1 px-3 text-[10px] uppercase tracking-[0.15em] text-stone-500">
                  {m.theSite}
                </div>
              )}
            </div>
          )}

          <ul className="space-y-1">
            {nav.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all ${
                      active
                        ? "bg-olive-50 text-stone-900 shadow-sm"
                        : "text-stone-800 hover:bg-stone-100 hover:translate-x-1"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                        active ? "bg-olive-600/10 text-olive-700" : "bg-stone-100 text-stone-600 group-hover:bg-parchment"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[10px] uppercase tracking-[0.15em] text-stone-500 mb-0.5">
                        {item.kicker}
                      </span>
                      <span className="block font-serif text-lg leading-tight">
                        {item.label}
                      </span>
                    </span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-olive-600" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="safe-bottom border-t border-stone-200 bg-parchment/95 px-6 py-4 flex-shrink-0">
          {user ? (
            <div className="flex flex-col gap-3">
              <Link
                href="/skriv"
                className="text-center px-4 py-3 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors shadow-sm"
              >
                {m.shareTestimony}
              </Link>
              <div className="flex items-center justify-between gap-3 text-sm">
                <Link href="/konto" className="min-w-0 flex-1 hover:text-olive-700">
                  <div className="text-xs text-stone-500">{m.myProfile}</div>
                  <div className="truncate text-stone-800 font-medium">{user.email}</div>
                </Link>
                <form action="/auth/sign-out" method="post">
                  <button className="text-stone-500 hover:text-stone-800" type="submit">
                    {n.signOut}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="block text-center px-4 py-3 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 font-medium transition-colors"
              >
                {n.login}
              </Link>
              <Link
                href="/registrera"
                className="block text-center px-4 py-3 rounded-full border border-stone-300 text-stone-800 hover:border-olive-500 font-medium transition-colors"
              >
                {n.register}
              </Link>
              <p className="text-xs text-stone-500 text-center">
                {m.loginHint}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
