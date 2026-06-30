import { redirect } from "next/navigation";
import { requireModerator, slugify } from "@/lib/admin";
import { TestimonyForm, testimonyPayload } from "../_form";

async function create(formData: FormData) {
  "use server";
  const { user, service } = await requireModerator();
  const payload: any = testimonyPayload(formData, user.id);
  if (!payload.slug) {
    payload.slug = `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (payload.status === "published") payload.published_at = new Date().toISOString();
  const { error } = await service.from("testimonies").insert(payload);
  if (error) throw new Error(error.message);
  redirect("/admin/vittnesbord");
}

export default function Page() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Nytt vittnesbörd</h1>
      <TestimonyForm action={create} />
    </div>
  );
}
