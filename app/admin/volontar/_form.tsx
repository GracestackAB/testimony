import Link from "next/link";

type Org = { id: string; name: string };

export function VolunteerForm({ action, row, orgs, deleteAction }: {
  action: (fd: FormData) => Promise<void>;
  row?: any;
  orgs: Org[];
  deleteAction?: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="max-w-3xl">
      <form action={action} className="space-y-5 bg-white p-6 rounded-xl border border-stone-200">
        {row?.id && <input type="hidden" name="__id" value={row.id} />}
        <div className="grid sm:grid-cols-[1fr_200px] gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Titel</span>
            <input name="title" defaultValue={row?.title} required className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Slug</span>
            <input name="slug" defaultValue={row?.slug} className="mt-1 w-full p-2.5 border border-stone-300 rounded font-mono text-sm" placeholder="auto" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Beskrivning</span>
          <textarea name="description" defaultValue={row?.description} required rows={5} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Kategori</span>
            <select name="category" defaultValue={row?.category || "praktiskt"} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="praktiskt">Praktiskt</option>
              <option value="omsorg">Omsorg</option>
              <option value="barn_ungdom">Barn/ungdom</option>
              <option value="musik_kreativt">Musik/kreativt</option>
              <option value="digitalt">Digitalt</option>
              <option value="administration">Administration</option>
              <option value="forbon">Förbön</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Engagemang</span>
            <select name="commitment" defaultValue={row?.commitment || "engangs"} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="engangs">Engångs</option>
              <option value="veckovis">Veckovis</option>
              <option value="manadsvis">Månadsvis</option>
              <option value="lopande">Löpande</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Status</span>
            <select name="status" defaultValue={row?.status || "open"} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="open">Öppen</option>
              <option value="filled">Fylld</option>
              <option value="paused">Pausad</option>
              <option value="archived">Arkiverad</option>
            </select>
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Verksamhet</span>
            <select name="organization_id" defaultValue={row?.organization_id || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded">
              <option value="">(ingen)</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-700 font-medium">Plats</span>
            <input name="location" defaultValue={row?.location || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Kompetens/krav</span>
          <input name="skills_required" defaultValue={row?.skills_required || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <label className="block">
          <span className="text-sm text-stone-700 font-medium">Kontaktmail</span>
          <input name="contact_email" type="email" defaultValue={row?.contact_email || ""} className="mt-1 w-full p-2.5 border border-stone-300 rounded" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="background_check_required" defaultChecked={row?.background_check_required} className="rounded" />
          <span className="text-sm">Kräver belastningsregisterutdrag</span>
        </label>

        <div className="flex items-center justify-between pt-2">
          <Link href="/admin/volontar" className="text-sm text-stone-600 hover:text-stone-900">← Tillbaka</Link>
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

export function volunteerPayload(fd: FormData) {
  return {
    title: String(fd.get("title")).trim(),
    slug: String(fd.get("slug") || "").trim(),
    description: String(fd.get("description")).trim(),
    category: String(fd.get("category") || "praktiskt"),
    commitment: String(fd.get("commitment") || "engangs"),
    status: String(fd.get("status") || "open"),
    organization_id: String(fd.get("organization_id") || "") || null,
    location: String(fd.get("location") || "").trim() || null,
    skills_required: String(fd.get("skills_required") || "").trim() || null,
    contact_email: String(fd.get("contact_email") || "").trim() || null,
    background_check_required: fd.get("background_check_required") === "on",
  };
}
