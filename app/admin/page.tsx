import Link from "next/link";
import { requireModerator } from "@/lib/admin";
import { getPendingDailyBibleCount } from "@/lib/bible/admin";
import { countAdminUsers } from "@/lib/admin/users";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const svc = await createServiceClient();

  const [testimonies, prayers, answers, gratitudes, orgs, vols, bible, pending, pendingBible, userCount] = await Promise.all([
    svc.from("testimonies").select("status", { count: "exact", head: true }),
    svc.from("prayer_requests").select("status", { count: "exact", head: true }),
    svc.from("prayer_answers").select("status", { count: "exact", head: true }),
    svc.from("gratitudes").select("status", { count: "exact", head: true }),
    svc.from("organizations").select("id", { count: "exact", head: true }),
    svc.from("volunteer_opportunities").select("id", { count: "exact", head: true }),
    svc.from("daily_bible").select("id", { count: "exact", head: true }),
    svc.from("moderation_queue").select("id", { count: "exact", head: true }).is("reviewed_at", null),
    getPendingDailyBibleCount(),
    countAdminUsers(),
  ]);

  const cards = [
    { label: "Användare", count: userCount, href: "/admin/anvandare", color: "bg-white border-stone-200", icon: "👥" },
    { label: "Väntar granskning", count: pending.count ?? 0, href: "/admin/moderation", color: "bg-amber-50 border-amber-200 text-amber-900", icon: "⏳" },
    ...(pendingBible > 0
      ? [{
          label: "Bibeltext att godkänna",
          count: pendingBible,
          href: "/admin/bibeltexter",
          color: "bg-amber-50 border-amber-300 text-amber-950",
          icon: "📖",
        }]
      : []),
    { label: "Vittnesbörd totalt", count: testimonies.count ?? 0, href: "/admin/vittnesbord", color: "bg-white border-stone-200", icon: "🕊️" },
    { label: "Böneämnen", count: prayers.count ?? 0, href: "/admin/boneamnen", color: "bg-white border-stone-200", icon: "🙏" },
    { label: "Bönesvar", count: answers.count ?? 0, href: "/admin/bonesvar", color: "bg-white border-stone-200", icon: "✨" },
    { label: "Tack", count: gratitudes.count ?? 0, href: "/admin/tack", color: "bg-white border-stone-200", icon: "🌻" },
    { label: "Verksamheter", count: orgs.count ?? 0, href: "/admin/verksamheter", color: "bg-white border-stone-200", icon: "🏛️" },
    { label: "Volontäruppgifter", count: vols.count ?? 0, href: "/admin/volontar", color: "bg-white border-stone-200", icon: "🤝" },
    { label: "Bibeltexter", count: bible.count ?? 0, href: "/admin/bibeltexter", color: "bg-white border-stone-200", icon: "📖" },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-stone-900 mb-2">Översikt</h1>
        <p className="text-stone-600">Hantera allt innehåll på testimony.se.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {cards.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className={`block p-5 rounded-xl border ${c.color} hover:shadow-md hover:-translate-y-0.5 transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{c.icon}</span>
              <span className="font-serif text-3xl font-semibold">{c.count}</span>
            </div>
            <div className="text-sm text-stone-700">{c.label}</div>
          </Link>
        ))}
      </div>

      <section className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-4">Snabbåtgärder</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/admin/bibeltexter/ny" className="px-4 py-3 border border-stone-200 rounded-lg hover:border-olive-500 hover:bg-olive-50">
            <div className="font-medium">+ Ny bibeltext</div>
            <div className="text-xs text-stone-500">Dagens vers + förklaring</div>
          </Link>
          <Link href="/admin/vittnesbord/ny" className="px-4 py-3 border border-stone-200 rounded-lg hover:border-olive-500 hover:bg-olive-50">
            <div className="font-medium">+ Nytt vittnesbörd</div>
            <div className="text-xs text-stone-500">Publicera direkt som admin</div>
          </Link>
          <Link href="/admin/verksamheter/ny" className="px-4 py-3 border border-stone-200 rounded-lg hover:border-olive-500 hover:bg-olive-50">
            <div className="font-medium">+ Ny verksamhet</div>
            <div className="text-xs text-stone-500">Församling, café, social verksamhet</div>
          </Link>
          <Link href="/admin/volontar/ny" className="px-4 py-3 border border-stone-200 rounded-lg hover:border-olive-500 hover:bg-olive-50">
            <div className="font-medium">+ Ny volontäruppgift</div>
            <div className="text-xs text-stone-500">Behov som människor kan anmäla sig till</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
