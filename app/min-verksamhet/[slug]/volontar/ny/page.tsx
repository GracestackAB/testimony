import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOrgAccess } from "@/lib/org-admin";
import { slugify } from "@/lib/admin";
import { VolunteerForm, volunteerPayload } from "@/app/admin/volontar/_form";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { org } = await requireOrgAccess(slug);

  const orgSlug = slug;
  async function create(formData: FormData) {
    "use server";
    const { service, org } = await requireOrgAccess(orgSlug);
    const payload: any = volunteerPayload(formData);
    payload.organization_id = org.id;
    if (!payload.slug) payload.slug = `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await service.from("volunteer_opportunities").insert(payload);
    if (error) throw new Error(error.message);
    redirect(`/min-verksamhet/${orgSlug}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <nav className="text-sm text-stone-500 mb-4">
        <Link href={`/min-verksamhet/${slug}`} className="hover:text-stone-900">{org.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900">Ny volontäruppgift</span>
      </nav>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Ny volontäruppgift</h1>
      <VolunteerForm action={create} orgs={[{ id: org.id, name: org.name }]} />
    </div>
  );
}
