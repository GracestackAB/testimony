import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModerationAiAssist } from "@/components/admin/ModerationAiAssist";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation" };

async function decide(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle();
  if (!prof?.is_moderator) redirect("/");

  const queueId = String(formData.get("queue_id"));
  const kind = String(formData.get("kind")) as "testimony" | "prayer_request" | "prayer_answer" | "gratitude";
  const contentId = String(formData.get("content_id"));
  const decision = String(formData.get("decision")); // approve | reject
  const notes = String(formData.get("notes") || "");

  const table =
    kind === "testimony" ? "testimonies"
    : kind === "prayer_request" ? "prayer_requests"
    : kind === "gratitude" ? "gratitudes"
    : "prayer_answers";

  if (decision === "approve") {
    await supabase.from(table).update({
      status: "published",
      ...(kind === "testimony" || kind === "prayer_answer" || kind === "gratitude" ? { published_at: new Date().toISOString() } : {}),
    }).eq("id", contentId);
  } else {
    await supabase.from(table).update({ status: "rejected" }).eq("id", contentId);
  }

  await supabase.from("moderation_queue").update({
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    decision,
    notes,
  }).eq("id", queueId);

  redirect("/admin/moderation");
}

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/moderation");
  const { data: prof } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle();
  if (!prof?.is_moderator) redirect("/");

  const { data: queue } = await supabase
    .from("moderation_queue")
    .select("*")
    .is("reviewed_at", null)
    .order("submitted_at", { ascending: true });

  const items: any[] = [];
  for (const q of queue || []) {
    const table =
      q.content_kind === "testimony" ? "testimonies"
      : q.content_kind === "prayer_request" ? "prayer_requests"
      : q.content_kind === "gratitude" ? "gratitudes"
      : "prayer_answers";
    const { data } = await supabase.from(table).select("*").eq("id", q.content_id).maybeSingle();
    if (data) items.push({ queue: q, content: data });
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <header className="mb-10">
        <h1 className="font-serif text-3xl font-semibold text-stone-900">Moderationskö</h1>
        <p className="text-stone-600 mt-2">{items.length} inlägg väntar på granskning.</p>
      </header>

      {items.length === 0 ? (
        <p className="italic text-stone-500">Inget väntar. Kvarn går runt – bra jobbat.</p>
      ) : (
        <ul className="space-y-10">
          {items.map(({ queue, content }) => (
            <li key={queue.id} className="border border-stone-200 rounded bg-white p-6">
              <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">
                {queue.content_kind} · {new Date(queue.submitted_at).toLocaleString("sv-SE")}
              </div>
              {content.title && <h3 className="font-serif text-2xl font-semibold mb-1 text-stone-900">{content.title}</h3>}
              {content.lede && <p className="italic text-stone-600 mb-3">{content.lede}</p>}
              <p className="text-stone-800 whitespace-pre-wrap mb-4 font-serif">{content.body}</p>

              <ModerationAiAssist
                kind={queue.content_kind}
                title={content.title}
                lede={content.lede}
                body={content.body}
              />

              <form action={decide} className="space-y-3 border-t border-stone-200 pt-4">
                <input type="hidden" name="queue_id" value={queue.id} />
                <input type="hidden" name="kind" value={queue.content_kind} />
                <input type="hidden" name="content_id" value={queue.content_id} />
                <textarea name="notes" rows={2} placeholder="Ev. anteckningar (interna)" className="w-full p-2 border border-stone-300 rounded text-sm" />
                <div className="flex gap-3">
                  <button name="decision" value="approve" className="px-4 py-2 rounded-full bg-olive-600 text-parchment hover:bg-olive-700">
                    Godkänn &amp; publicera
                  </button>
                  <button name="decision" value="reject" className="px-4 py-2 rounded-full border border-stone-400 text-stone-700 hover:bg-stone-100">
                    Avvisa
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
