import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const svc = await createServiceClient();
  const { data: rows } = await svc
    .from("testimonies")
    .select("id, slug, title, format, status, is_anonymous, created_at, published_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Vittnesbörd</h1>
          <p className="text-stone-600 text-sm">Alla vittnesbörd — redigera, publicera, arkivera.</p>
        </div>
        <Link href="/admin/vittnesbord/ny" className="shrink-0 px-4 py-2 rounded-full bg-stone-900 text-parchment text-sm hover:bg-stone-800">+ Nytt vittnesbörd</Link>
      </header>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Rubrik</th>
              <th className="text-left px-5 py-3">Format</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Publicerad</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-stone-500">Inga vittnesbörd ännu.</td></tr>
            )}
            {(rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-5 py-3">
                  <div className="font-medium text-stone-900">{r.title}</div>
                  <div className="text-xs text-stone-500 font-mono">/{r.slug}</div>
                </td>
                <td className="px-5 py-3 text-stone-600">{r.format}</td>
                <td className="px-5 py-3">
                  <StatusBadge s={r.status} />
                </td>
                <td className="px-5 py-3 text-xs text-stone-500">
                  {r.published_at ? new Date(r.published_at).toLocaleDateString("sv-SE") : "—"}
                </td>
                <td className="px-5 py-3 text-right space-x-3">
                  <Link href={`/vittnesbord/${r.slug}`} className="text-stone-500 text-xs">Visa</Link>
                  <Link href={`/admin/vittnesbord/${r.id}`} className="text-olive-700 underline">Redigera</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const cls: Record<string, string> = {
    published: "bg-olive-100 text-olive-900",
    pending: "bg-amber-100 text-amber-900",
    draft: "bg-stone-100 text-stone-700",
    rejected: "bg-red-100 text-red-900",
    archived: "bg-stone-200 text-stone-600",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${cls[s] || "bg-stone-100"}`}>{s}</span>;
}
