import { redirect } from "next/navigation";
import { requireModerator } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tack — admin" };

async function update(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  const payload: any = {
    body: String(formData.get("body") || "").trim(),
    status: String(formData.get("status") || "pending"),
    is_anonymous: formData.get("is_anonymous") === "on",
  };
  if (payload.status === "published") payload.published_at = new Date().toISOString();
  await service.from("gratitudes").update(payload).eq("id", id);
  redirect("/admin/tack");
}

async function create(formData: FormData) {
  "use server";
  const { user, service } = await requireModerator();
  await service.from("gratitudes").insert({
    body: String(formData.get("body") || "").trim(),
    author_id: user.id,
    is_anonymous: false,
    status: "published",
    published_at: new Date().toISOString(),
  });
  redirect("/admin/tack");
}

async function remove(formData: FormData) {
  "use server";
  const { service } = await requireModerator();
  const id = String(formData.get("id"));
  await service.from("moderation_queue").delete().eq("content_kind", "gratitude").eq("content_id", id);
  await service.from("gratitudes").delete().eq("id", id);
  redirect("/admin/tack");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-olive-100 text-olive-800",
    pending: "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full ${map[status] || "bg-stone-100 text-stone-700"}`}>
      {status}
    </span>
  );
}

export default async function Page() {
  const svc = await createServiceClient();
  const { data: rows } = await svc
    .from("gratitudes")
    .select("id, body, status, is_anonymous, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Tack</h1>
        <p className="text-stone-600 text-sm">Hantera tacksamhetsinlägg — redigera, publicera, avvisa eller radera.</p>
      </header>

      {/* Skapa nytt */}
      <section className="mb-10 bg-gradient-to-br from-gold-300/10 to-parchment border border-gold-300/40 rounded-xl p-5">
        <h2 className="font-serif text-xl font-semibold mb-3 text-stone-900">+ Nytt tack (publiceras direkt)</h2>
        <form action={create} className="space-y-3">
          <textarea
            name="body"
            required
            rows={3}
            maxLength={500}
            placeholder="Idag är jag tacksam för…"
            className="w-full p-3 border border-stone-300 rounded text-sm focus:ring-2 focus:ring-gold-500/30 focus:outline-none"
          />
          <button type="submit" className="px-4 py-2 rounded-full bg-gold-500 text-white hover:bg-gold-700 font-medium text-sm">
            Publicera
          </button>
        </form>
      </section>

      {/* Lista */}
      <ul className="space-y-4">
        {(rows || []).map((r: any) => (
          <li key={r.id} className="bg-white border border-stone-200 rounded-lg p-5">
            <form action={update} className="space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <div className="flex items-center justify-between">
                <StatusBadge status={r.status} />
                <span className="text-xs text-stone-500">
                  Skapad {new Date(r.created_at).toLocaleDateString("sv-SE")}
                  {r.published_at && ` · Publicerad ${new Date(r.published_at).toLocaleDateString("sv-SE")}`}
                </span>
              </div>
              <textarea
                name="body"
                required
                rows={3}
                maxLength={500}
                defaultValue={r.body}
                className="w-full p-2 border border-stone-300 rounded text-sm"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select name="status" defaultValue={r.status} className="px-3 py-1.5 border border-stone-300 rounded text-sm">
                  <option value="pending">Väntar</option>
                  <option value="published">Publicerad</option>
                  <option value="rejected">Avvisad</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" name="is_anonymous" defaultChecked={r.is_anonymous} /> Anonym
                </label>
                <button type="submit" className="ml-auto px-3 py-1.5 rounded-full bg-stone-900 text-parchment text-sm hover:bg-stone-800">
                  Spara
                </button>
              </div>
            </form>
            <form action={remove} className="mt-3 pt-3 border-t border-stone-100">
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="text-xs text-red-700 hover:text-red-900 underline">
                Radera permanent
              </button>
            </form>
          </li>
        ))}
        {(!rows || rows.length === 0) && (
          <li className="text-center text-stone-500 italic py-8">Inga tack ännu.</li>
        )}
      </ul>
    </div>
  );
}
