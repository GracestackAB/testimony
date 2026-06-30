import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOrgAccess } from "@/lib/org-admin";
import { OrgForm, orgPayload } from "@/app/admin/verksamheter/_form";

async function update(formData: FormData) {
  "use server";
  const id = String(formData.get("__id"));
  // Hämta org via id för att få slug + verifiera access
  const { createServiceClient } = await import("@/lib/supabase/server");
  const svcTmp = await createServiceClient();
  const { data: orgRow } = await svcTmp.from("organizations").select("slug").eq("id", id).maybeSingle();
  if (!orgRow) throw new Error("Verksamhet hittades inte");

  const { service, role } = await requireOrgAccess(orgRow.slug);

  const payload: any = orgPayload(formData);
  // Org-admins får inte ändra slug eller type från egen panel
  if (role !== "moderator") {
    delete payload.slug;
    delete payload.type;
  }
  const newSlug = payload.slug || orgRow.slug;
  const { error } = await service.from("organizations").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  redirect(`/min-verksamhet/${newSlug}`);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { org, role } = await requireOrgAccess(slug);

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <nav className="text-sm text-stone-500 mb-4">
        <Link href="/min-verksamhet" className="hover:text-stone-900">Mina verksamheter</Link>
        <span className="mx-2">/</span>
        <Link href={`/min-verksamhet/${slug}`} className="hover:text-stone-900">{org.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900">Redigera</span>
      </nav>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Redigera {org.name}</h1>
      {role !== "moderator" && (
        <p className="mb-5 text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded p-3">
          Du kan ändra all info utom <strong>slug</strong> och <strong>typ</strong> — hör av dig till en moderator om du behöver ändra dessa.
        </p>
      )}
      <OrgForm action={update} row={org} />
    </div>
  );
}
