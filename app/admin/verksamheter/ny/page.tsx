import { redirect } from "next/navigation";
import { requireModerator, slugify } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { OrgForm, orgPayload } from "../_form";

async function create(formData: FormData) {
  "use server";
  await requireModerator();
  const svc = await createServiceClient();
  const payload = orgPayload(formData);
  if (!payload.slug) payload.slug = slugify(payload.name);
  const { error } = await svc.from("organizations").insert(payload);
  if (error) throw new Error(error.message);
  redirect("/admin/verksamheter");
}

export default function Page() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Ny verksamhet</h1>
      <OrgForm action={create} />
    </div>
  );
}
