import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { DraftSaver } from "@/components/DraftSaver";
import { DraftCleaner } from "@/components/DraftCleaner";
import { AiWritingAssist } from "@/components/write/AiWritingAssist";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.write.title };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function encodeError(msg: string) {
  return encodeURIComponent(msg).slice(0, 400);
}

async function isModerator(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("is_moderator").eq("id", userId).maybeSingle();
  return !!data?.is_moderator;
}

async function submitTestimony(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/skriv");
  const title = String(formData.get("title") || "").trim();
  const lede = String(formData.get("lede") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const format = String(formData.get("format") || "skriven");
  const media_embed_url = String(formData.get("media_embed_url") || "").trim() || null;
  const is_anonymous = formData.get("anonymous") === "on";
  const inspired_by_testimony_id = String(formData.get("inspired_by") || "") || null;
  if (!title || !body) redirect("/skriv?error=missing");
  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;
  const reading_minutes = Math.max(1, Math.round(body.split(/\s+/).length / 220));
  const service = await createServiceClient();
  const mod = await isModerator(service, user.id);
  const status = mod ? "published" : "pending";
  const { error } = await service.from("testimonies").insert({
    slug, title, lede: lede || null, body,
    format, media_embed_url,
    is_anonymous, author_id: user.id, status, reading_minutes,
    inspired_by_testimony_id,
    ...(mod ? { published_at: new Date().toISOString() } : {}),
  });
  if (error) {
    console.error("submitTestimony error:", error);
    redirect(`/skriv?error=${encodeError(error.message)}#vittnesbord`);
  }
  redirect("/skriv?sent=testimony");
}

async function submitRequest(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/skriv");
  const body = String(formData.get("body") || "").trim();
  const title = String(formData.get("title") || "").trim() || null;
  if (!body) redirect("/skriv?error=missing#boneamne");
  if (body.length > 500) redirect("/skriv?error=length#boneamne");
  const service = await createServiceClient();
  const mod = await isModerator(service, user.id);
  const { error } = await service.from("prayer_requests").insert({
    body, title, author_id: user.id, is_anonymous: formData.get("anonymous") === "on",
    status: mod ? "published" : "pending",
  });
  if (error) {
    console.error("submitRequest error:", error);
    redirect(`/skriv?error=${encodeError(error.message)}#boneamne`);
  }
  redirect("/skriv?sent=request#boneamne");
}

async function submitGratitude(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/skriv");
  const body = String(formData.get("body") || "").trim();
  if (!body) redirect("/skriv?error=missing#tack");
  if (body.length > 500) redirect("/skriv?error=length#tack");
  const service = await createServiceClient();
  const mod = await isModerator(service, user.id);
  const { error } = await service.from("gratitudes").insert({
    body, author_id: user.id, is_anonymous: formData.get("anonymous") === "on",
    status: mod ? "published" : "pending",
    ...(mod ? { published_at: new Date().toISOString() } : {}),
  });
  if (error) {
    console.error("submitGratitude error:", error);
    redirect(`/skriv?error=${encodeError(error.message)}#tack`);
  }
  redirect("/skriv?sent=gratitude#tack");
}

async function submitAnswer(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/skriv");
  const body = String(formData.get("body") || "").trim();
  if (!body) redirect("/skriv?error=missing#bonesvar");
  if (body.length > 500) redirect("/skriv?error=length#bonesvar");
  const service = await createServiceClient();
  const mod = await isModerator(service, user.id);
  const { error } = await service.from("prayer_answers").insert({
    body, author_id: user.id, is_anonymous: formData.get("anonymous") === "on",
    status: mod ? "published" : "pending",
    ...(mod ? { published_at: new Date().toISOString() } : {}),
  });
  if (error) {
    console.error("submitAnswer error:", error);
    redirect(`/skriv?error=${encodeError(error.message)}#bonesvar`);
  }
  redirect("/skriv?sent=answer#bonesvar");
}

export default async function Page({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; inspired_by?: string }> }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { sent, error, inspired_by } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/skriv");

  // Hämta publicerade vittnesbörd för inspired_by-dropdown
  const { data: publishedTestimonies } = await supabase
    .from("testimonies")
    .select("id, title, slug")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  // Om inspired_by i URL — hämta det specifika vittnesbördet
  let inspiredByRow: { id: string; title: string; slug: string } | null = null;
  if (inspired_by) {
    const { data } = await supabase
      .from("testimonies")
      .select("id, title, slug")
      .eq("id", inspired_by)
      .eq("status", "published")
      .maybeSingle();
    if (data) inspiredByRow = data;
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="mb-10">
        <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-3">{t.write.title}</h1>
        <p className="text-stone-600 leading-relaxed">{t.write.intro}</p>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          <li><a href="#vittnesbord" className="text-olive-700 underline">{t.write.testimonyLink}</a> — {t.write.testimonyDesc}</li>
          <li><a href="#tack" className="text-olive-700 underline">{t.write.gratitudeLink}</a> — {t.write.gratitudeDesc}</li>
          <li><a href="#boneamne" className="text-olive-700 underline">{t.write.prayerLink}</a> — {t.write.prayerDesc}</li>
          <li><a href="#bonesvar" className="text-olive-700 underline">{t.write.answerLink}</a> — {t.write.answerDesc}</li>
        </ul>
        <p className="text-xs text-stone-500 mt-4">{t.write.moderationNote}</p>
      </header>

      <DraftCleaner sent={sent} />
      {sent && (
        <p className="mb-6 p-4 bg-olive-50 border border-olive-100 text-olive-800 rounded">
          {t.write.thanksSent}
        </p>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-900 rounded">
          <div className="font-medium mb-1">{t.write.saveError}</div>
          <div className="text-sm text-red-800">
            {error === "missing" && t.write.errMissing}
            {error === "length" && t.write.errLength}
            {error !== "missing" && error !== "length" && decodeURIComponent(error)}
          </div>
        </div>
      )}

      <section id="vittnesbord" className="mb-14">
        <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">{t.write.testimony.sectionTitle}</h2>
        <p className="text-sm text-stone-600 mb-5">{t.write.testimony.intro}</p>
        <form action={submitTestimony} className="space-y-5 bg-white p-5 border border-stone-200 rounded">
          <DraftSaver formKey="testimony" label="vittnesbörd-utkast" />
          <AiWritingAssist kind="testimony" locale={locale} seedField="body" />
          <label className="block">
            <span className="block text-sm font-medium text-stone-800">{t.write.testimony.titleLabel}</span>
            <span className="block text-xs text-stone-500 mb-1">{t.write.testimony.titleHint}</span>
            <input
              name="title"
              required
              placeholder={t.write.testimony.titlePlaceholder}
              className="w-full p-2.5 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-stone-800">
              {t.write.testimony.ledeLabel} <span className="text-stone-400 font-normal">({t.write.optional})</span>
            </span>
            <span className="block text-xs text-stone-500 mb-1">{t.write.testimony.ledeHint}</span>
            <input
              name="lede"
              placeholder={t.write.testimony.ledePlaceholder}
              className="w-full p-2.5 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-stone-800">{t.write.testimony.bodyLabel}</span>
            <span className="block text-xs text-stone-500 mb-1">{t.write.testimony.bodyHint}</span>
            <textarea
              name="body"
              required
              rows={12}
              placeholder={t.write.testimony.bodyPlaceholder}
              className="w-full p-3 border border-stone-300 rounded font-serif text-base focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
            />
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-stone-700">{t.write.testimony.formatLabel}</span>
              <select name="format" className="mt-1 w-full p-2 border border-stone-300 rounded">
                <option value="skriven">{t.write.formats.written}</option>
                <option value="musik">{t.write.formats.music}</option>
                <option value="video">{t.write.formats.video}</option>
                <option value="bildberattelse">{t.write.formats.photoStory}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-stone-700">{t.write.testimony.mediaLabel}</span>
              <input name="media_embed_url" className="mt-1 w-full p-2 border border-stone-300 rounded" placeholder="https://youtube.com/watch?v=..." />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-stone-700">{t.write.testimony.inspiredLabel} <span className="text-stone-400 text-xs">({t.write.optional})</span></span>
            <select name="inspired_by" defaultValue={inspiredByRow?.id || ""} className="mt-1 w-full p-2 border border-stone-300 rounded bg-white">
              <option value="">{t.write.testimony.inspiredNone}</option>
              {inspiredByRow && !publishedTestimonies?.find(t => t.id === inspiredByRow!.id) && (
                <option value={inspiredByRow.id}>{inspiredByRow.title}</option>
              )}
              {(publishedTestimonies || []).map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <span className="text-xs text-stone-500 mt-1 block">{t.write.testimony.inspiredHint}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="anonymous" /> {t.write.anonymous}
          </label>
          <button type="submit" className="px-5 py-2.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700">
            {t.write.submitForReview}
          </button>
        </form>
      </section>

      <section id="tack" className="mb-14">
        <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">{t.write.gratitude.sectionTitle}</h2>
        <p className="text-sm text-stone-600 mb-5">{t.write.gratitude.intro}</p>
        <form action={submitGratitude} className="space-y-5 bg-white p-5 border border-gold-300/40 rounded">
          <DraftSaver formKey="gratitude" label="tack-utkast" />
          <AiWritingAssist kind="gratitude" locale={locale} seedField="body" />
          <label className="block">
            <span className="block text-sm font-medium text-stone-800">{t.write.gratitude.bodyLabel}</span>
            <span className="block text-xs text-stone-500 mb-1">{t.write.gratitude.bodyHint}</span>
            <textarea
              name="body"
              required
              rows={3}
              maxLength={500}
              placeholder={t.write.gratitude.bodyPlaceholder}
              className="w-full p-3 border border-stone-300 rounded focus:ring-2 focus:ring-gold-500/30 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="anonymous" /> {t.write.anonymous}
          </label>
          <button type="submit" className="px-5 py-2.5 rounded-full bg-gold-500 text-white hover:bg-gold-700 font-medium">
            {t.write.shareGratitude}
          </button>
        </form>
      </section>

      <section id="boneamne" className="mb-14">
        <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">{t.write.prayer.sectionTitle}</h2>
        <p className="text-sm text-stone-600 mb-5">{t.write.prayer.intro}</p>
        <form action={submitRequest} className="space-y-5 bg-white p-5 border border-stone-200 rounded">
          <DraftSaver formKey="prayer_request" label="böneämne-utkast" />
          <AiWritingAssist kind="prayer_request" locale={locale} seedField="body" />
          <label className="block">
            <span className="block text-sm font-medium text-stone-800">
              {t.write.prayer.titleLabel} <span className="text-stone-400 font-normal">({t.write.optional})</span>
            </span>
            <span className="block text-xs text-stone-500 mb-1">{t.write.prayer.titleHint}</span>
            <input
              name="title"
              placeholder={t.write.prayer.titlePlaceholder}
              className="w-full p-2.5 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-stone-800">{t.write.prayer.bodyLabel}</span>
            <span className="block text-xs text-stone-500 mb-1">{t.write.prayer.bodyHint}</span>
            <textarea
              name="body"
              required
              rows={5}
              maxLength={500}
              placeholder={t.write.prayer.bodyPlaceholder}
              className="w-full p-3 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="anonymous" defaultChecked /> {t.write.anonymousDefault}
          </label>
          <button type="submit" className="px-5 py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800">
            {t.write.submitPrayer}
          </button>
        </form>
      </section>

      <section id="bonesvar" className="mb-14">
        <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">{t.write.answer.sectionTitle}</h2>
        <p className="text-sm text-stone-600 mb-5">{t.write.answer.intro}</p>
        <form action={submitAnswer} className="space-y-5 bg-white p-5 border border-stone-200 rounded">
          <DraftSaver formKey="prayer_answer" label="bönesvar-utkast" />
          <AiWritingAssist kind="prayer_answer" locale={locale} seedField="body" />
          <label className="block">
            <span className="block text-sm font-medium text-stone-800">{t.write.answer.bodyLabel}</span>
            <span className="block text-xs text-stone-500 mb-1">{t.write.answer.bodyHint}</span>
            <textarea
              name="body"
              required
              rows={5}
              maxLength={500}
              placeholder={t.write.answer.bodyPlaceholder}
              className="w-full p-3 border border-stone-300 rounded focus:ring-2 focus:ring-olive-600/30 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="anonymous" /> {t.write.anonymous}
          </label>
          <button type="submit" className="px-5 py-2.5 rounded-full bg-gold-500 text-white hover:bg-gold-700">
            {t.write.submitAnswer}
          </button>
        </form>
      </section>

      <p className="text-sm text-stone-500">
        <Link href="/" className="underline">← {t.common.back}</Link>
      </p>
    </div>
  );
}
