import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireOrgAccess } from "@/lib/org-admin";
import { VolunteerForm, volunteerPayload } from "@/app/admin/volontar/_form";

export default async function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { org, service } = await requireOrgAccess(slug);

  const { data: row } = await service
    .from("volunteer_opportunities")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!row) notFound();

  const orgSlug = slug;
  const volId = id;

  async function update(formData: FormData) {
    "use server";
    const { service, org } = await requireOrgAccess(orgSlug);
    const payload: any = volunteerPayload(formData);
    payload.organization_id = org.id; // tvinga
    const { error } = await service
      .from("volunteer_opportunities")
      .update(payload)
      .eq("id", volId)
      .eq("organization_id", org.id);
    if (error) throw new Error(error.message);
    redirect(`/min-verksamhet/${orgSlug}`);
  }

  async function remove() {
    "use server";
    const { service, org } = await requireOrgAccess(orgSlug);
    await service.from("volunteer_applications").delete().eq("opportunity_id", volId);
    await service.from("volunteer_opportunities").delete().eq("id", volId).eq("organization_id", org.id);
    redirect(`/min-verksamhet/${orgSlug}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <nav className="text-sm text-stone-500 mb-4">
        <Link href={`/min-verksamhet/${slug}`} className="hover:text-stone-900">{org.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900">{row.title}</span>
      </nav>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Redigera volontäruppgift</h1>
      <VolunteerForm action={update} row={row} orgs={[{ id: org.id, name: org.name }]} deleteAction={remove} />
    </div>
  );
}
