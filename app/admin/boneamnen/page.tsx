import Link from "next/link";
import { redirect } from "next/navigation";
import { requireModerator } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function update(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  const payload = {
    title: String(formData.get("title") || "").trim() || null,
    body: String(formData.get("body") || "").trim(),
    status: String(formData.get("status") || "pending"),
    is_anonymous: formData.get("is_anonymous") === "on",
    is_answered: formData.get("is_answered") === "on",
  };
  await service.from("prayer_requests").update(payload).eq("id", id);
  redirect("/admin/boneamnen");
}

async function create(formData: FormData) {
  "use server";
  const { user, service } = await requireModerator();
  const payload = {
    title: String(formData.get("title") || "").trim() || null,
    body: String(formData.get("body") || "").trim(),
    status: "published",
    is_anonymous: false,
    author_id: user.id,
  };
  await service.from("prayer_requests").insert(payload);
  redirect("/admin/boneamnen");
}

async function remove(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  await service.from("moderation_queue").delete().eq("content_kind", "prayer_request").eq("content_id", id);
  await service.from("prayer_answers").delete().eq("request_id", id);
  await service.from("prayer_requests").delete().eq("id", id);
  redirect("/admin/boneamnen");
}

export default async function Page() {
  const svc = await createServiceClient();
  const { data: rows } = await svc
    .from("prayer_requests")
    .select("id, title, body, status, is_answered, is_anonymous, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Böneämnen</h1>
        <p className="text-stone-600 text-sm">Klicka på ett ämne för att redigera direkt.</p>
      </header>

      <details className="mb-6 bg-white rounded-xl border border-stone-200 p-5">
        <summary className="cursor-pointer font-medium text-stone-900">+ Skapa nytt böneämne</summary>
        <form action={create} className="space-y-3 mt-4">
          <input name="title" placeholder="Rubrik (frivillig)" className="w-full p-2.5 border border-stone-300 rounded" />
          <textarea name="body" required rows={3} maxLength={500} placeholder="Be om..." className="w-full p-2.5 border border-stone-300 rounded" />
          <button className="px-4 py-2 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 text-sm">Publicera</button>
        </form>
      </details>

      <div className="space-y-3">
        {(rows || []).length === 0 && (
          <p className="text-stone-500 text-center py-8">Inga böneämnen ännu.</p>
        )}
        {(rows || []).map((r: any) => (
          <details key={r.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            <summary className="cursor-pointer p-4 flex items-start justify-between gap-4 hover:bg-stone-50">
              <div className="min-w-0 flex-1">
                {r.title && <div className="font-medium text-stone-900 mb-1">{r.title}</div>}
                <div className="text-sm text-stone-700 line-clamp-2">{r.body}</div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <StatusBadge s={r.status} />
                {r.is_answered && <span className="text-xs px-2 py-0.5 rounded-full bg-olive-100 text-olive-900">besvarad</span>}
              </div>
            </summary>
            <form action={update} className="p-4 border-t border-stone-100 space-y-3 bg-stone-50">
              <input type="hidden" name="id" value={r.id} />
              <input name="title" defaultValue={r.title || ""} placeholder="Rubrik" className="w-full p-2 border border-stone-300 rounded bg-white" />
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
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="is_answered" defaultChecked={r.is_answered} /> Besvarad
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
    draft: "bg-stone-100 text-stone-700",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${cls[s] || "bg-stone-100"}`}>{s}</span>;
}
