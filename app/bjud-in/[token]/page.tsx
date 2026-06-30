import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Du är inbjuden" };

async function accept(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/bjud-in/${token}`);

  const svc = await createServiceClient();
  const { data: inv } = await svc
    .from("organization_invites")
    .select("*, organizations(id, slug, name)")
    .eq("token", token)
    .maybeSingle();

  if (!inv) redirect("/?err=invalid-invite");
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) redirect("/?err=expired-invite");
  if (inv.max_uses && inv.uses >= inv.max_uses) redirect("/?err=used-invite");

  // Säkerställ profil
  await svc.from("profiles").upsert({ id: user.id }, { onConflict: "id" });

  // Skapa membership (om inte redan finns)
  await svc
    .from("memberships")
    .upsert(
      { user_id: user.id, organization_id: inv.organization_id, role: inv.role },
      { onConflict: "user_id,organization_id" }
    );

  // Logga användning + öka räknare
  await svc.from("invite_uses").insert({
    invite_id: inv.id,
    accepted_by: user.id,
  });
  await svc
    .from("organization_invites")
    .update({ uses: inv.uses + 1 })
    .eq("id", inv.id);

  redirect(`/min-verksamhet/${inv.organizations.slug}?welcomed=1`);
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const svc = await createServiceClient();
  const { data: inv } = await svc
    .from("organization_invites")
    .select("*, organizations(slug, name, description, type, city, hero_image_url)")
    .eq("token", token)
    .maybeSingle();

  if (!inv) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-3">Ogiltig länk</h1>
        <p className="text-stone-600 mb-6">Denna inbjudan finns inte eller har tagits bort.</p>
        <Link href="/" className="text-olive-700 underline">← Till startsidan</Link>
      </div>
    );
  }

  const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
  const used = inv.max_uses && inv.uses >= inv.max_uses;
  const org = inv.organizations;

  if (expired || used) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-3">
          {expired ? "Inbjudan har gått ut" : "Inbjudan är förbrukad"}
        </h1>
        <p className="text-stone-600 mb-6">
          Be personen som delade länken att skapa en ny.
        </p>
        <Link href={`/plats/${org.slug}`} className="text-olive-700 underline">
          Se {org.name} ändå →
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
        <div className="text-xs uppercase tracking-widest text-olive-700 mb-3">Du är inbjuden</div>
        <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-3">
          Välkommen till <span className="text-olive-700">{org.name}</span>
        </h1>
        {org.description && (
          <p className="text-stone-600 mb-6 text-lg">{org.description}</p>
        )}
        <div className="text-sm text-stone-500 mb-8">
          Du blir{" "}
          <strong>{inv.role === "admin" ? "admin för verksamheten" : "medlem"}</strong> och
          kan {inv.role === "admin" ? "redigera info, lägga upp volontäruppgifter och hantera ansökningar" : "följa och stötta verksamheten"}.
        </div>

        {user ? (
          <form action={accept}>
            <input type="hidden" name="token" value={token} />
            <button className="w-full px-6 py-3.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors">
              Acceptera inbjudan som {user.email}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/login?next=/bjud-in/${token}`}
              className="block text-center w-full px-6 py-3.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 font-medium transition-colors"
            >
              Logga in eller skapa konto
            </Link>
            <p className="text-xs text-stone-500 text-center">
              När du loggat in kommer du tillbaka hit för att acceptera.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
