import { redirect } from "next/navigation";
import { requireModerator, slugify } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { VolunteerForm, volunteerPayload } from "../_form";

async function create(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const payload: any = volunteerPayload(formData);
  if (!payload.slug) payload.slug = `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await service.from("volunteer_opportunities").insert(payload);
  if (error) throw new Error(error.message);
  redirect("/admin/volontar");
}

export default async function Page() {
  const svc = await createServiceClient();
  const { data: orgs } = await svc.from("organizations").select("id, name").order("name");
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Ny volontäruppgift</h1>
      <VolunteerForm action={create} orgs={orgs || []} />
    </div>
  );
}
