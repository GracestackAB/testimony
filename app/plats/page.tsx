import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const metadata = { title: "Verksamheter" };

const TYPE_LABEL: Record<string, string> = {
  forsamling: "Församling",
  social: "Social verksamhet",
  cafe: "Café / mötesplats",
  lager: "Lägerverksamhet",
  bibelskola: "Bibelskola",
  boneroerelse: "Bönerörelse",
  annat: "Annat",
};

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("is_published", true)
    .order("name");

  const orgs = data || [];
  const byType: Record<string, typeof orgs> = {};
  for (const o of orgs) {
    (byType[o.type] ||= []).push(o);
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <header className="mb-12 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">Pelare 2 · Katalog</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">Verksamheter</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">
          Var det händer. Församlingar, caféer, sociala verksamheter – platser där tron tar form i handling.
        </p>
      </header>

      {Object.entries(byType).map(([type, list]) => (
        <section key={type} className="mb-12">
          <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-5 border-b border-stone-200 pb-2">
            {TYPE_LABEL[type] || type}
          </h2>
          <ul className="grid md:grid-cols-2 gap-5">
            {list.map((o) => (
              <li key={o.id}>
                <Link href={`/plats/${o.slug}`} className="block p-5 rounded border border-stone-200 hover:border-olive-500 bg-white transition">
                  <div className="font-serif text-xl font-semibold text-stone-900 mb-1">{o.name}</div>
                  {o.city && <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">{o.city}</div>}
                  {o.description && <p className="text-sm text-stone-600 leading-relaxed">{o.description}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
