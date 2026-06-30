import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgs } from "@/lib/org-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Min verksamhet" };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/min-verksamhet");

  const orgs = await getUserOrgs(user.id);

  if (orgs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-3">Min verksamhet</h1>
        <p className="text-stone-600 mb-6">
          Du är inte kopplad som admin till någon verksamhet ännu. Om du ansvarar för en församling,
          ett café eller en social verksamhet — hör av dig till oss så lägger vi upp den.
        </p>
        <Link href="/" className="inline-block px-5 py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800">
          ← Till startsidan
        </Link>
      </div>
    );
  }

  if (orgs.length === 1) {
    redirect(`/min-verksamhet/${orgs[0].slug}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-2">Mina verksamheter</h1>
      <p className="text-stone-600 mb-8">Välj en verksamhet att hantera.</p>
      <div className="grid gap-3">
        {orgs.map(o => (
          <Link
            key={o.id}
            href={`/min-verksamhet/${o.slug}`}
            className="flex items-center justify-between p-5 bg-white border border-stone-200 rounded-xl hover:border-olive-500 hover:shadow-md transition-all"
          >
            <div>
              <div className="font-serif text-xl text-stone-900">{o.name}</div>
              <div className="text-xs text-stone-500 font-mono mt-1">/{o.slug}</div>
            </div>
            <span className="text-olive-700">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
