import Link from "next/link";

export function OrgForm({ action, row, deleteAction }: {
  action: (fd: FormData) => Promise<void>;
  row?: any;
  deleteAction?: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="max-w-3xl">
      <form action={action} className="space-y-5 bg-white p-6 rounded-xl border border-stone-200">
        {row?.id && <input type="hidden" name="__id" value={row.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Namn</span>
            <input name="name" defaultValue={row?.name} required className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Slug (URL)</span>
            <input name="slug" defaultValue={row?.slug} required pattern="[a-z0-9-]+" className="mt-1 w-full p-2.5 border border-stone-300 rounded font-mono text-sm" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Typ</span>
            <select name="type" defaultValue={row?.type || "forsamling"} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="forsamling">Församling</option>
              <option value="social">Social verksamhet</option>
              <option value="cafe">Café / mötesplats</option>
              <option value="lager">Läger / retreat</option>
              <option value="bibelskola">Bibelskola</option>
              <option value="boneroerelse">Bönerörelse</option>
              <option value="annat">Annat</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Stad</span>
            <input name="city" defaultValue={row?.city || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Adress</span>
          <input name="address" defaultValue={row?.address || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Kort beskrivning (visas på listsidan)</span>
          <input name="description" defaultValue={row?.description || ""} maxLength={200} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Om oss (längre text, används för radbryt med blank rad)</span>
          <textarea name="about" defaultValue={row?.about || ""} rows={6} className="mt-1 w-full p-2.5 border border-stone-300 rounded font-serif" />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Webbplats</span>
            <input name="website_url" type="url" defaultValue={row?.website_url || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Kontaktmail</span>
            <input name="contact_email" type="email" defaultValue={row?.contact_email || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Telefon</span>
            <input name="contact_phone" defaultValue={row?.contact_phone || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Öppettider / mötesdagar</span>
            <input name="hours" defaultValue={row?.hours || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Hero-bild URL</span>
          <input name="hero_image_url" type="url" defaultValue={row?.hero_image_url || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>

        <div className="pt-4 border-t border-stone-200">
          <div className="text-sm text-stone-700 font-medium mb-2">YouTube — auto-hämta senaste videor</div>
          <label className="block">
            <span className="text-xs text-stone-600">
              Kanal-URL, handle eller channel_id (t.ex. <code className="font-mono">https://youtube.com/@norrtullkyrkan</code>, <code className="font-mono">UC...</code>, eller playlist-URL)
            </span>
            <input
              name="youtube_channel_id"
              defaultValue={row?.youtube_channel_id || ""}
              placeholder="https://youtube.com/channel/UC..."
              className="mt-1 w-full p-2.5 border border-stone-300 rounded text-sm font-mono"
            />
          </label>
          <p className="text-xs text-stone-500 mt-2">
            Om satt, hämtas de 5 senaste videorna automatiskt. <strong>OBS:</strong> <code>@handle</code> stöds inte direkt — hitta channel_id via <a href="https://www.streamweasels.com/tools/youtube-channel-id-and-user-id-convertor/" target="_blank" rel="noopener" className="text-olive-700 underline">streamweasels.com</a>.
          </p>

          <div className="mt-5 text-sm text-stone-700 font-medium mb-2">Manuell gudstjänst-video (om inte YouTube-kanal)</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-stone-600">Embed-URL</span>
              <input name="latest_sermon_url" type="url" defaultValue={row?.latest_sermon_url || ""} placeholder="https://www.youtube.com/embed/VIDEO_ID" className="mt-1 w-full p-2.5 border border-stone-300 rounded text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Videotitel</span>
              <input name="latest_sermon_title" defaultValue={row?.latest_sermon_title || ""} placeholder="Gudstjänst 19 april 2026" className="mt-1 w-full p-2.5 border border-stone-300 rounded text-sm" />
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2 pt-2">
          <input type="checkbox" name="is_published" defaultChecked={row?.is_published ?? true} className="rounded" />
          <span className="text-sm">Publicerad (syns på sajten)</span>
        </label>

        <div className="flex items-center justify-between pt-2">
          <Link href="/admin/verksamheter" className="text-sm text-stone-600 hover:text-stone-900">← Tillbaka</Link>
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

export function orgPayload(fd: FormData) {
  return {
    name: String(fd.get("name")).trim(),
    slug: String(fd.get("slug")).trim(),
    type: String(fd.get("type") || "forsamling"),
    city: String(fd.get("city") || "").trim() || null,
    address: String(fd.get("address") || "").trim() || null,
    description: String(fd.get("description") || "").trim() || null,
    about: String(fd.get("about") || "").trim() || null,
    website_url: String(fd.get("website_url") || "").trim() || null,
    contact_email: String(fd.get("contact_email") || "").trim() || null,
    contact_phone: String(fd.get("contact_phone") || "").trim() || null,
    hours: String(fd.get("hours") || "").trim() || null,
    hero_image_url: String(fd.get("hero_image_url") || "").trim() || null,
    latest_sermon_url: String(fd.get("latest_sermon_url") || "").trim() || null,
    latest_sermon_title: String(fd.get("latest_sermon_title") || "").trim() || null,
    youtube_channel_id: String(fd.get("youtube_channel_id") || "").trim() || null,
    is_published: fd.get("is_published") === "on",
  };
}
