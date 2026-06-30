import { redirect, notFound } from "next/navigation";
import { requireModerator } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { VolunteerForm, volunteerPayload } from "../_form";

async function update(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("__id"));
  const { error } = await service.from("volunteer_opportunities").update(volunteerPayload(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/admin/volontar");
}

async function remove(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  await service.from("volunteer_applications").delete().eq("opportunity_id", id);
  await service.from("volunteer_opportunities").delete().eq("id", id);
  redirect("/admin/volontar");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svc = await createServiceClient();
  const [{ data: row }, { data: orgs }] = await Promise.all([
    svc.from("volunteer_opportunities").select("*").eq("id", id).maybeSingle(),
    svc.from("organizations").select("id, name").order("name"),
  ]);
  if (!row) notFound();
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Redigera volontäruppgift</h1>
      <VolunteerForm action={update} row={row} orgs={orgs || []} deleteAction={remove} />
    </div>
  );
}
