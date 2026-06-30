import { redirect, notFound } from "next/navigation";
import { requireModerator } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { TestimonyForm, testimonyPayload } from "../_form";

async function update(formData: FormData) {
  "use server";
  const { user, service } = await requireModerator();
  const id = String(formData.get("__id"));
  const payload: any = testimonyPayload(formData, user.id);
  // Bibehåll ursprunglig author_id
  const { data: existing } = await service.from("testimonies").select("author_id, published_at").eq("id", id).maybeSingle();
  if (existing?.author_id) payload.author_id = existing.author_id;
  if (payload.status === "published" && !existing?.published_at) {
    payload.published_at = new Date().toISOString();
  }
  const { error } = await service.from("testimonies").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/admin/vittnesbord");
}

async function remove(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  await service.from("content_organizations").delete().eq("content_kind", "testimony").eq("content_id", id);
  await service.from("moderation_queue").delete().eq("content_kind", "testimony").eq("content_id", id);
  await service.from("testimonies").delete().eq("id", id);
  redirect("/admin/vittnesbord");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svc = await createServiceClient();
  const { data: row } = await svc.from("testimonies").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Redigera vittnesbörd</h1>
      <TestimonyForm action={update} row={row} deleteAction={remove} />
    </div>
  );
}
