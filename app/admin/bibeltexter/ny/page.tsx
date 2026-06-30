import { redirect } from "next/navigation";
import { requireModerator } from "@/lib/admin";
import { dailyBiblePayloadFromForm } from "@/lib/bible/admin-actions";
import { createServiceClient } from "@/lib/supabase/server";
import { BibleForm } from "../_form";

async function create(formData: FormData) {
  "use server";
  await requireModerator();
  const svc = await createServiceClient();
  const payload = dailyBiblePayloadFromForm(formData);
  const { error } = await svc.from("daily_bible").insert(payload);
  if (error) throw new Error(error.message);
  redirect("/admin/bibeltexter");
}

export default async function Page() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Ny bibeltext</h1>
      <BibleForm action={create} />
    </div>
  );
}
