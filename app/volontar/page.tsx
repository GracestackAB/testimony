import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const metadata = { title: "Volontär" };

const CATEGORIES = [
  { key: "praktiskt", label: "Praktiskt" },
  { key: "omsorg", label: "Omsorg" },
  { key: "barn_ungdom", label: "Barn & ungdom" },
  { key: "musik_kreativt", label: "Musik & kreativt" },
  { key: "digitalt", label: "Digitalt" },
  { key: "administration", label: "Administration" },
  { key: "forbon", label: "Förbön" },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ kategori?: string }> }) {
  const { kategori } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("volunteer_opportunities")
    .select("id, slug, title, description, category, commitment, location, status, organization_id, organizations(name, slug)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (kategori) query = query.eq("category", kategori);

  const { data } = await query;
  const list = data || [];

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <header className="mb-10 text-center">
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">Pelare 3 · Hur du är med</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">Volontär</h1>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">
          Läsa → be → handla. Hitta en uppgift som passar dig – från engångsinsats till löpande engagemang.
        </p>
      </header>

      <div className="flex flex-wrap justify-center gap-2 mb-10 text-sm">
        <Link
          href="/volontar"
          className={`px-3 py-1.5 rounded-full border ${!kategori ? "bg-stone-900 text-parchment border-stone-900" : "border-stone-300 text-stone-700 hover:border-olive-500"}`}
        >
          Alla
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/volontar?kategori=${c.key}`}
            className={`px-3 py-1.5 rounded-full border ${kategori === c.key ? "bg-stone-900 text-parchment border-stone-900" : "border-stone-300 text-stone-700 hover:border-olive-500"}`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-center text-stone-500 italic">Inga volontäruppgifter just nu.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((v: any) => (
            <li key={v.id}>
              <Link href={`/volontar/${v.slug}`} className="block p-5 border border-stone-200 rounded bg-white hover:border-olive-500 transition">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-serif text-xl font-semibold text-stone-900">{v.title}</div>
                  <span className="text-[11px] uppercase tracking-wider text-stone-500">{v.commitment}</span>
                </div>
                {v.organizations?.name && (
                  <div className="text-xs text-stone-500 mb-2">{v.organizations.name}{v.location ? ` · ${v.location}` : ""}</div>
                )}
                <p className="text-sm text-stone-600 line-clamp-2">{v.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
