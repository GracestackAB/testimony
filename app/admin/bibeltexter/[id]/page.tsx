import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModerator } from "@/lib/admin";
import { getDailyBibleForAdmin, isDailyBibleAdminKey } from "@/lib/bible/admin-lookup";
import { adminBibleTextHref } from "@/lib/bible/admin-href";
import {
  getPendingDailyBibleRows,
  reconcileStaleBibleReviewNotifications,
} from "@/lib/bible/admin-notifications";
import {
  approveDailyBibleById,
  bibleIdFromForm,
  dailyBiblePayloadFromForm,
  deleteDailyBibleById,
  updateDailyBibleById,
} from "@/lib/bible/admin-actions";
import { BibleForm } from "../_form";

export const dynamic = "force-dynamic";

async function update(formData: FormData) {
  "use server";
  await requireModerator();
  const bibleId = bibleIdFromForm(formData);
  if (!bibleId) redirect("/admin/bibeltexter?error=not-found");
  const payload = dailyBiblePayloadFromForm(formData);
  try {
    await updateDailyBibleById(bibleId, payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kunde inte spara";
    redirect(`/admin/bibeltexter/${bibleId}?error=${encodeURIComponent(message.slice(0, 120))}`);
  }
  revalidatePath("/admin/bibeltexter");
  revalidatePath("/dagens-bibeltext");
  redirect("/admin/bibeltexter");
}

async function approve(formData: FormData) {
  "use server";
  await requireModerator();
  const bibleId = bibleIdFromForm(formData);
  if (!bibleId) redirect("/admin/bibeltexter?error=not-found");
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

async function remove(formData: FormData) {
  "use server";
  await requireModerator();
  const bibleId = bibleIdFromForm(formData);
  if (!bibleId) redirect("/admin/bibeltexter?error=not-found");
  await deleteDailyBibleById(bibleId);
  redirect("/admin/bibeltexter");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireModerator();
  await reconcileStaleBibleReviewNotifications();
  const { id: key } = await params;

  if (!isDailyBibleAdminKey(key)) {
    redirect("/admin/bibeltexter?error=not-found");
  }

  const row = await getDailyBibleForAdmin(key);
  if (!row) redirect("/admin/bibeltexter?error=not-found");

  const stillPending = await getPendingDailyBibleRows();

  if (row.status !== "pending") {
    return (
      <div>
        <div className="mb-6 rounded-xl border border-olive-200 bg-olive-50 px-5 py-4 text-sm text-olive-900">
          <strong>Redan granskad.</strong> Texten för {row.for_date} ({row.reference}) är{" "}
          <em>{row.status}</em>.
        </div>

        {stillPending.length > 0 ? (
          <>
            <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-4">
              Detta väntar fortfarande granskning
            </h1>
            <div className="space-y-4 mb-8">
              {stillPending.map((p) => (
                <article key={p.id} className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                  <div className="text-xs text-amber-800 uppercase tracking-widest mb-1">{p.for_date}</div>
                  <h2 className="font-serif text-xl font-semibold text-stone-900 mb-2">{p.reference}</h2>
                  <blockquote className="border-l-4 border-olive-600 pl-4 italic font-serif text-stone-800 mb-3">
                    {p.text_body}
                  </blockquote>
                  <Link
                    href={adminBibleTextHref(p)}
                    className="inline-block px-4 py-2 rounded-full bg-olive-700 text-parchment text-sm hover:bg-olive-800"
                  >
                    Granska {p.for_date}
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="text-stone-600 mb-6">Inget mer att granska just nu.</p>
        )}

        <Link href="/admin/bibeltexter" className="text-olive-700 underline">
          ← Tillbaka till alla bibeltexter
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900">Granska bibeltext</h1>
        {row.status === "pending" && (
          <form action={approve}>
            <input type="hidden" name="bible_id" value={row.id} />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-olive-700 text-parchment hover:bg-olive-800 font-medium text-sm"
            >
              Godkänn och publicera
            </button>
          </form>
        )}
      </div>

      {row.status === "pending" && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          Denna text är <strong>pending</strong> och syns inte publikt förrän du godkänner den.
        </div>
      )}

      <article className="mb-8 bg-white rounded-xl border border-stone-200 p-6">
        <div className="text-xs text-stone-500 uppercase tracking-widest mb-1">{row.for_date}</div>
        <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">{row.reference}</h2>
        <blockquote className="border-l-4 border-olive-500 pl-4 italic font-serif text-lg text-stone-700 mb-4">
          {row.text_body}
        </blockquote>
        {row.explanation && (
          <div className="prose prose-stone text-sm">
            {row.explanation.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </article>

      <h2 className="font-serif text-xl font-semibold text-stone-900 mb-4">Redigera</h2>
      <BibleForm action={update} row={row} deleteAction={remove} />
    </div>
  );
}
