import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const svc = await createServiceClient();
  const { data: rows } = await svc
    .from("volunteer_opportunities")
    .select("id, slug, title, category, commitment, status, organizations(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Volontäruppgifter</h1>
          <p className="text-stone-600 text-sm">Behov där människor kan anmäla sig.</p>
        </div>
        <Link href="/admin/volontar/ny" className="shrink-0 px-4 py-2 rounded-full bg-stone-900 text-parchment text-sm hover:bg-stone-800">+ Ny uppgift</Link>
      </header>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Titel</th>
              <th className="text-left px-5 py-3">Verksamhet</th>
              <th className="text-left px-5 py-3">Kategori</th>
              <th className="text-left px-5 py-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-stone-500">Inga uppgifter ännu.</td></tr>
            )}
            {(rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-5 py-3 font-medium text-stone-900">
                  {r.title}
                  <div className="text-xs text-stone-500 font-mono">/{r.slug}</div>
                </td>
                <td className="px-5 py-3 text-stone-600">{r.organizations?.name || "—"}</td>
                <td className="px-5 py-3 text-stone-600">{r.category} · {r.commitment}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                    r.status === "open" ? "bg-olive-100 text-olive-900" : "bg-stone-100 text-stone-700"
                  }`}>{r.status}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/volontar/${r.id}`} className="text-olive-700 underline">Redigera</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
