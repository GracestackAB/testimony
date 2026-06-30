import Link from "next/link";
import { coerceContentStatus } from "@/lib/bible/admin-actions";

type Row = {
  id?: string;
  for_date?: string;
  reference?: string;
  text_body?: string;
  explanation?: string | null;
  status?: string;
};

export function BibleForm({ action, row, deleteAction }: {
  action: (fd: FormData) => Promise<void>;
  row?: Row;
  deleteAction?: (fd: FormData) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-3xl">
      <form action={action} className="space-y-5 bg-white p-6 rounded-xl border border-stone-200">
        {row?.id && <input type="hidden" name="bible_id" value={row.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Datum</span>
            <input
              type="date"
              name="for_date"
              defaultValue={
                row?.for_date
                  ? String(row.for_date).slice(0, 10)
                  : today
              }
              required
              className="mt-1 w-full p-2.5 border border-stone-300 rounded"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Status</span>
            <select name="status" defaultValue={coerceContentStatus(row?.status, "published")} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="published">Publicerad</option>
              <option value="pending">Väntar granskning</option>
              <option value="draft">Utkast</option>
              <option value="archived">Arkiverad</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Bibelreferens</span>
          <input
            name="reference"
            defaultValue={row?.reference}
            required
            placeholder="t.ex. Johannes 3:16"
            className="mt-1 w-full p-2.5 border border-stone-300 rounded"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Bibeltext</span>
          <textarea
            name="text_body"
            defaultValue={row?.text_body}
            required
            rows={4}
            placeholder="Själva versen, citerad direkt."
            className="mt-1 w-full p-2.5 border border-stone-300 rounded font-serif"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Förklaring (frivillig)</span>
          <textarea
            name="explanation"
            defaultValue={row?.explanation || ""}
            rows={6}
            placeholder="En kort reflektion eller kontext."
            className="mt-1 w-full p-2.5 border border-stone-300 rounded"
          />
        </label>
        <div className="flex items-center justify-between pt-2">
          <Link href="/admin/bibeltexter" className="text-sm text-stone-600 hover:text-stone-900">
            ← Tillbaka
          </Link>
          <button className="px-5 py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 font-medium">
            Spara
          </button>
        </div>
      </form>

      {deleteAction && row?.id && (
        <form action={deleteAction} className="mt-4">
          <input type="hidden" name="bible_id" value={row.id} />
          <button className="text-sm text-red-700 hover:text-red-900 underline">
            Radera permanent
          </button>
        </form>
      )}
    </div>
  );
}
