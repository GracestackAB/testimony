import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const svc = await createServiceClient();
  const { data: rows } = await svc
    .from("organizations")
    .select("id, slug, name, type, city, is_published")
    .order("name");

  return (
    <div>
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Verksamheter</h1>
          <p className="text-stone-600 text-sm">Församlingar, caféer, sociala verksamheter.</p>
        </div>
        <Link href="/admin/verksamheter/ny" className="shrink-0 px-4 py-2 rounded-full bg-stone-900 text-parchment text-sm hover:bg-stone-800">+ Ny verksamhet</Link>
      </header>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Namn</th>
              <th className="text-left px-5 py-3">Typ</th>
              <th className="text-left px-5 py-3">Stad</th>
              <th className="text-left px-5 py-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-5 py-3 font-medium text-stone-900">
                  {r.name}
                  <div className="text-xs text-stone-500 font-mono">/{r.slug}</div>
                </td>
                <td className="px-5 py-3 text-stone-600">{r.type}</td>
                <td className="px-5 py-3 text-stone-600">{r.city || "—"}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${r.is_published ? "bg-olive-100 text-olive-900" : "bg-stone-100 text-stone-700"}`}>
                    {r.is_published ? "publicerad" : "utkast"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right space-x-3">
                  <Link href={`/plats/${r.slug}`} className="text-stone-500 hover:text-stone-900 text-xs">Visa</Link>
                  <Link href={`/admin/verksamheter/${r.id}`} className="text-olive-700 hover:text-olive-900 underline">Redigera</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
