import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModerator } from "@/lib/admin";
import { getPendingDailyBibleCount } from "@/lib/bible/admin";
import {
  getPendingDailyBibleRows,
  reconcileStaleBibleReviewNotifications,
} from "@/lib/bible/admin-notifications";
import { publishDailyBibleForDate } from "@/lib/bible/daily";
import { isAiConfigured } from "@/lib/ai/client";
import { approveDailyBibleById, bibleIdFromForm } from "@/lib/bible/admin-actions";
import { adminBibleTextHref } from "@/lib/bible/admin-href";
import { normalizeForDate } from "@/lib/bible/dates";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DailyBibleRow = {
  id: string;
  for_date: string;
  reference: string;
  text_body: string | null;
  status: string;
};

async function approve(formData: FormData) {
  "use server";
  await requireModerator();
  const bibleId = bibleIdFromForm(formData);
  if (!bibleId) {
    redirect("/admin/bibeltexter?error=not-found");
  }
  try {
    await approveDailyBibleById(bibleId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Godkännande misslyckades";
    redirect(`/admin/bibeltexter?error=${encodeURIComponent(message.slice(0, 120))}`);
  }
  revalidatePath("/admin/bibeltexter");
  revalidatePath("/dagens-bibeltext");
  redirect("/admin/bibeltexter?approved=1");
}

async function generate(formData: FormData) {
  "use server";
  await requireModerator();
  if (!isAiConfigured()) {
    redirect("/admin/bibeltexter?error=ai");
  }

  const forDate = String(formData.get("for_date") || new Date().toISOString().slice(0, 10));
  const force = formData.get("force") === "1";

  try {
    const result = await publishDailyBibleForDate(forDate, force);
    revalidatePath("/admin/bibeltexter");
    revalidatePath("/dagens-bibeltext");
    if (result.skipped) {
      redirect(`/admin/bibeltexter?skipped=1&date=${forDate}`);
    }
    redirect(`/admin/bibeltexter?generated=1&date=${forDate}&ref=${encodeURIComponent(result.reference || "")}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    redirect(`/admin/bibeltexter?error=${encodeURIComponent(message.slice(0, 120))}`);
  }
}

function FlashBanner({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const generated = searchParams.generated === "1";
  const skipped = searchParams.skipped === "1";
  const approved = searchParams.approved === "1";
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const date = typeof searchParams.date === "string" ? searchParams.date : "";
  const ref = typeof searchParams.ref === "string" ? decodeURIComponent(searchParams.ref) : "";

  if (generated) {
    return (
      <div className="mb-6 rounded-xl border border-olive-200 bg-olive-50 px-5 py-4 text-sm text-olive-900">
        <strong>✓ Bibeltext genererad</strong> för {date}
        {ref ? ` (${ref})` : ""}. Status: <em>pending</em> — godkänn nedan innan den syns publikt.
      </div>
    );
  }
  if (skipped) {
    return (
      <div className="mb-6 rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-sm text-stone-700">
        Det finns redan en bibeltext för {date || "det datumet"}. Använd &quot;Generera om&quot; för att skriva över.
      </div>
    );
  }
  if (approved) {
    return (
      <div className="mb-6 rounded-xl border border-olive-200 bg-olive-50 px-5 py-4 text-sm text-olive-900">
        <strong>✓ Godkänd och publicerad</strong> på sajten.
      </div>
    );
  }
  if (error === "ai") {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
        AI-provider saknas — kontrollera Azure OpenAI-konfigurationen.
      </div>
    );
  }
  if (error === "not-found") {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        Bibeltexten kunde inte hittas. Välj en rad i listan nedan.
      </div>
    );
  }
  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
        <strong>Generering misslyckades:</strong> {error}
      </div>
    );
  }
  return null;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  await requireModerator();
  try {
    await reconcileStaleBibleReviewNotifications();
  } catch (err: unknown) {
    console.error("[bibeltexter] reconcile notifications:", err instanceof Error ? err.message : err);
  }

  const svc = await createServiceClient();
  let pendingCount = 0;
  let pendingRows: Awaited<ReturnType<typeof getPendingDailyBibleRows>> = [];
  try {
    [pendingCount, pendingRows] = await Promise.all([
      getPendingDailyBibleCount(),
      getPendingDailyBibleRows(),
    ]);
  } catch (err: unknown) {
    console.error("[bibeltexter] pending load:", err instanceof Error ? err.message : err);
  }

  const { data } = await svc
      .from("daily_bible")
      .select("id, for_date, reference, text_body, status")
      .order("for_date", { ascending: false })
      .limit(100);
  const rows = (data ?? []).map((r: DailyBibleRow & { for_date: unknown }) => ({
    ...r,
    for_date: normalizeForDate(r.for_date),
  })) as DailyBibleRow[];
  const today = new Date().toISOString().slice(0, 10);
  const aiReady = isAiConfigured();

  return (
    <div>
      <FlashBanner searchParams={params} />

      {pendingCount > 0 && (
        <section id="pending" className="mb-10">
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-4">
            Väntar granskning ({pendingCount})
          </h2>
          <div className="space-y-4">
            {pendingRows.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-amber-300 bg-amber-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-xs text-amber-800 uppercase tracking-widest">{p.for_date}</div>
                    <h3 className="font-serif text-xl font-semibold text-stone-900">{p.reference}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={adminBibleTextHref(p)}
                      className="px-4 py-2 rounded-full border border-amber-700 text-amber-900 text-sm hover:bg-amber-100"
                    >
                      Granska
                    </Link>
                    <form action={approve}>
                      <input type="hidden" name="bible_id" value={p.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-olive-700 text-parchment text-sm hover:bg-olive-800"
                      >
                        Godkänn
                      </button>
                    </form>
                  </div>
                </div>
                <blockquote className="border-l-4 border-olive-600 pl-4 italic font-serif text-stone-800 mb-3">
                  {p.text_body}
                </blockquote>
                {p.explanation && (
                  <p className="text-sm text-stone-700 line-clamp-3">{p.explanation}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {pendingCount > 0 && !params.generated && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <strong>{pendingCount} bibeltext{pendingCount > 1 ? "er" : ""} väntar granskning</strong> — se sektionen ovan.
          Sajten visar senast publicerade vers tills du godkänner.
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Dagens bibeltext</h1>
          <p className="text-stone-600 text-sm">
            AI-cron kl 07:00 (svensk tid) skapar utkast — godkänn <em>pending</em> innan publicering.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {aiReady && (
            <>
              <form action={generate}>
                <input type="hidden" name="for_date" value={today} />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full border border-olive-600 text-olive-800 text-sm hover:bg-olive-50"
                >
                  Generera idag med AI
                </button>
              </form>
              <form action={generate}>
                <input type="hidden" name="for_date" value={today} />
                <input type="hidden" name="force" value="1" />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full border border-stone-300 text-stone-700 text-sm hover:bg-stone-50"
                >
                  Generera om
                </button>
              </form>
            </>
          )}
          <Link
            href="/admin/bibeltexter/ny"
            className="px-4 py-2 rounded-full bg-stone-900 text-parchment text-sm hover:bg-stone-800"
          >
            + Ny manuellt
          </Link>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Datum</th>
              <th className="text-left px-5 py-3">Referens</th>
              <th className="text-left px-5 py-3">Text</th>
              <th className="text-left px-5 py-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-stone-500">Inga bibeltexter ännu. Klicka &quot;Generera idag med AI&quot; eller &quot;+ Ny manuellt&quot;.</td></tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-stone-100 hover:bg-stone-50 ${r.status === "pending" ? "bg-amber-50/60" : ""}`}
              >
                <td className="px-5 py-3 font-mono text-xs text-stone-700">{r.for_date}</td>
                <td className="px-5 py-3 font-medium text-stone-900">{r.reference}</td>
                <td className="px-5 py-3 text-stone-600 truncate max-w-[300px]">
                  {r.text_body ? `${r.text_body.slice(0, 60)}…` : "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                    r.status === "published"
                      ? "bg-olive-100 text-olive-900"
                      : r.status === "pending"
                        ? "bg-amber-100 text-amber-900 font-medium"
                        : "bg-stone-100 text-stone-700"
                  }`}>{r.status}</span>
                </td>
                <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                  {r.status === "pending" && (
                    <>
                      <Link
                        href={adminBibleTextHref(r)}
                        className="text-amber-900 hover:text-amber-950 underline text-sm font-medium"
                      >
                        Granska
                      </Link>
                      <form action={approve} className="inline">
                        <input type="hidden" name="bible_id" value={r.id} />
                        <button
                          type="submit"
                          className="text-olive-700 hover:text-olive-900 underline text-sm font-medium"
                        >
                          Godkänn
                        </button>
                      </form>
                    </>
                  )}
                  <Link href={adminBibleTextHref(r)} className="text-olive-700 hover:text-olive-900 underline">
                    Redigera
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
