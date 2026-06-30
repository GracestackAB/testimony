import { redirect } from "next/navigation";
import { requireModerator } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function update(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  const payload = {
    body: String(formData.get("body") || "").trim(),
    status: String(formData.get("status") || "pending"),
    is_anonymous: formData.get("is_anonymous") === "on",
  };
  await service.from("prayer_answers").update(payload).eq("id", id);
  redirect("/admin/bonesvar");
}

async function create(formData: FormData) {
  "use server";
  const { user, service } = await requireModerator();
  await service.from("prayer_answers").insert({
    body: String(formData.get("body") || "").trim(),
    author_id: user.id,
    is_anonymous: false,
    status: "published",
    published_at: new Date().toISOString(),
  });
  redirect("/admin/bonesvar");
}

async function remove(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  await service.from("moderation_queue").delete().eq("content_kind", "prayer_answer").eq("content_id", id);
  await service.from("prayer_answers").delete().eq("id", id);
  redirect("/admin/bonesvar");
}

export default async function Page() {
  const svc = await createServiceClient();
  const { data: rows } = await svc
    .from("prayer_answers")
    .select("id, body, status, is_anonymous, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Bönesvar</h1>
        <p className="text-stone-600 text-sm">Korta vittnesbörd om när Gud svarade på bön.</p>
      </header>

      <details className="mb-6 bg-white rounded-xl border border-stone-200 p-5">
        <summary className="cursor-pointer font-medium text-stone-900">+ Skapa nytt bönesvar</summary>
        <form action={create} className="space-y-3 mt-4">
          <textarea name="body" required rows={3} maxLength={500} placeholder="Vad hände?" className="w-full p-2.5 border border-stone-300 rounded" />
          <button className="px-4 py-2 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 text-sm">Publicera</button>
        </form>
      </details>

      <div className="space-y-3">
        {(rows || []).length === 0 && <p className="text-stone-500 text-center py-8">Inga bönesvar ännu.</p>}
        {(rows || []).map((r: any) => (
          <details key={r.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            <summary className="cursor-pointer p-4 flex items-start justify-between gap-4 hover:bg-stone-50">
              <div className="text-sm text-stone-700 line-clamp-2 flex-1">{r.body}</div>
              <StatusBadge s={r.status} />
            </summary>
            <form action={update} className="p-4 border-t border-stone-100 space-y-3 bg-stone-50">
              <input type="hidden" name="id" value={r.id} />
              <textarea name="body" required rows={3} defaultValue={r.body} maxLength={500} className="w-full p-2 border border-stone-300 rounded bg-white" />
              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-sm">Status: <select name="status" defaultValue={r.status} className="p-1.5 border border-stone-300 rounded bg-white">
                  <option value="published">Publicerad</option>
                  <option value="pending">Granskning</option>
                  <option value="rejected">Avvisad</option>
                  <option value="archived">Arkiverad</option>
                </select></label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="is_anonymous" defaultChecked={r.is_anonymous} /> Anonym
                </label>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button formAction={remove} className="text-sm text-red-700 hover:text-red-900 underline">Radera</button>
                <button className="px-4 py-2 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 text-sm">Spara</button>
              </div>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const cls: Record<string, string> = {
    published: "bg-olive-100 text-olive-900",
    pending: "bg-amber-100 text-amber-900",
    rejected: "bg-red-100 text-red-900",
    archived: "bg-stone-200 text-stone-600",
  };
  return <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs ${cls[s] || "bg-stone-100"}`}>{s}</span>;
}
