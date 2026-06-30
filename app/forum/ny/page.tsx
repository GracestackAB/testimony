import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewThreadForm } from "@/components/forum/NewThreadForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ny tråd – Forum" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/forum/ny${kategori ? `?kategori=${kategori}` : ""}`);

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, name, icon")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  const cats = categories ?? [];
  const initialCatId = kategori
    ? cats.find((c) => c.slug === kategori)?.id ?? cats[0]?.id ?? ""
    : cats[0]?.id ?? "";

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900">Ny tråd</h1>
        <p className="text-sm text-stone-600 mt-1">Var ärlig, var snäll. Sök gärna efter liknande trådar innan du startar en ny.</p>
      </header>
      <NewThreadForm categories={cats} initialCategoryId={initialCatId} />
    </div>
  );
}
