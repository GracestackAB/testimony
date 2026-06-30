import Link from "next/link";

export function TestimonyForm({ action, row, deleteAction }: {
  action: (fd: FormData) => Promise<void>;
  row?: any;
  deleteAction?: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="max-w-3xl">
      <form action={action} className="space-y-5 bg-white p-6 rounded-xl border border-stone-200">
        {row?.id && <input type="hidden" name="__id" value={row.id} />}
        <div className="grid sm:grid-cols-[1fr_200px] gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Rubrik</span>
            <input name="title" defaultValue={row?.title} required className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Slug</span>
            <input name="slug" defaultValue={row?.slug} className="mt-1 w-full p-2.5 border border-stone-300 rounded font-mono text-sm" placeholder="skapas auto" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Ingress</span>
          <input name="lede" defaultValue={row?.lede || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Brödtext</span>
          <textarea name="body" defaultValue={row?.body} required rows={12} className="mt-1 w-full p-2.5 border border-stone-300 rounded font-serif text-base" />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Format</span>
            <select name="format" defaultValue={row?.format || "skriven"} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="skriven">Skriven</option>
              <option value="musik">Musik</option>
              <option value="video">Video</option>
              <option value="bildberattelse">Bildberättelse</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Status</span>
            <select name="status" defaultValue={row?.status || "published"} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="published">Publicerad</option>
              <option value="pending">Granskning</option>
              <option value="draft">Utkast</option>
              <option value="archived">Arkiverad</option>
              <option value="rejected">Avvisad</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Media-URL (YouTube-embed)</span>
          <input name="media_embed_url" type="url" defaultValue={row?.media_embed_url || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Omslagsbild URL</span>
          <input name="cover_image_url" type="url" defaultValue={row?.cover_image_url || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <label className="flex items-center gap-2 pt-2">
          <input type="checkbox" name="is_anonymous" defaultChecked={row?.is_anonymous} className="rounded" />
          <span className="text-sm">Anonymt</span>
        </label>

        <div className="flex items-center justify-between pt-2">
          <Link href="/admin/vittnesbord" className="text-sm text-stone-600 hover:text-stone-900">← Tillbaka</Link>
          <button className="px-5 py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 font-medium">Spara</button>
        </div>
      </form>

      {deleteAction && row?.id && (
        <form action={deleteAction} className="mt-4">
          <input type="hidden" name="id" value={row.id} />
          <button className="text-sm text-red-700 hover:text-red-900 underline">Radera permanent</button>
        </form>
      )}
    </div>
  );
}

export function testimonyPayload(fd: FormData, authorId: string) {
  const title = String(fd.get("title")).trim();
  const body = String(fd.get("body")).trim();
  return {
    title,
    slug: String(fd.get("slug") || "").trim() || null,
    lede: String(fd.get("lede") || "").trim() || null,
    body,
    format: String(fd.get("format") || "skriven"),
    status: String(fd.get("status") || "published"),
    media_embed_url: String(fd.get("media_embed_url") || "").trim() || null,
    cover_image_url: String(fd.get("cover_image_url") || "").trim() || null,
    is_anonymous: fd.get("is_anonymous") === "on",
    reading_minutes: Math.max(1, Math.round(body.split(/\s+/).length / 220)),
    author_id: authorId,
  };
}
