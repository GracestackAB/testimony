import Link from "next/link";
import { requireModerator } from "@/lib/admin";
import { getPendingDailyBibleCount } from "@/lib/bible/admin";

export const metadata = { title: "Admin — testimony.se" };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Översikt", icon: "📊", badgeKey: null },
  { href: "/admin/moderation", label: "Granska kö", icon: "⏳", badgeKey: "moderation" as const },
  { href: "/admin/bibeltexter", label: "Dagens bibeltext", icon: "📖", badgeKey: "bible" as const },
  { href: "/admin/anvandare", label: "Användare", icon: "👥", badgeKey: null },
  { href: "/admin/vittnesbord", label: "Vittnesbörd", icon: "🕊️", badgeKey: null },
  { href: "/admin/boneamnen", label: "Böneämnen", icon: "🙏", badgeKey: null },
  { href: "/admin/bonesvar", label: "Bönesvar", icon: "✨", badgeKey: null },
  { href: "/admin/verksamheter", label: "Verksamheter", icon: "🏛️", badgeKey: null },
  { href: "/admin/volontar", label: "Volontäruppgifter", icon: "🤝", badgeKey: null },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, service } = await requireModerator();
  const [pendingBible, { count: pendingMod }] = await Promise.all([
    getPendingDailyBibleCount(),
    service
      .from("moderation_queue")
      .select("id", { count: "exact", head: true })
      .is("reviewed_at", null),
  ]);

  const badges: Record<string, number> = {
    bible: pendingBible,
    moderation: pendingMod ?? 0,
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="space-y-1 lg:sticky lg:top-20 self-start">
          <div className="mb-4 px-2">
            <div className="text-xs uppercase tracking-widest text-stone-500">Admin</div>
            <div className="font-serif text-lg text-stone-900">{profile?.display_name || "Moderator"}</div>
          </div>
          {NAV.map((item) => {
            const badge = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-700 hover:bg-white hover:text-stone-900 hover:shadow-sm transition-all"
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="bg-amber-400 text-stone-900 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-4 mt-4 border-t border-stone-200 px-3">
            <Link href="/" className="text-xs text-stone-500 hover:text-stone-900">
              ← Till sajten
            </Link>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
