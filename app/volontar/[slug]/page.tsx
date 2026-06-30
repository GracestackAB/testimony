import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail, emailTemplate } from "@/lib/email";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("volunteer_opportunities").select("title, description").eq("slug", slug).maybeSingle();
  return { title: data?.title || "Volontäruppgift", description: data?.description || undefined };
}

async function applyAction(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/volontar/${formData.get("slug")}`);
  const slugStr = String(formData.get("slug"));
  const opportunityId = String(formData.get("opportunity_id"));
  const message = String(formData.get("message") || "");
  await supabase.from("volunteer_applications").insert({
    opportunity_id: opportunityId,
    user_id: user.id,
    message,
  });

  // Notifiera verksamhetsadmins via email (best-effort, blockerar inte redirect)
  try {
    const svc = await createServiceClient();
    const { data: opp } = await svc
      .from("volunteer_opportunities")
      .select("title, contact_email, organization_id, organizations(name, slug)")
      .eq("id", opportunityId)
      .maybeSingle();
    if (opp) {
      const recipients: string[] = [];
      // Direkt-kontakt på uppgiften
      if (opp.contact_email) recipients.push(opp.contact_email);
      // Verksamhetsadmins
      if (opp.organization_id) {
        const { data: mems } = await svc
          .from("memberships")
          .select("user_id")
          .eq("organization_id", opp.organization_id)
          .eq("role", "admin");
        if (mems && mems.length > 0) {
          const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
          for (const m of mems) {
            const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${m.user_id}`, {
              headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
            });
            const u = await r.json();
            if (u?.email) recipients.push(u.email);
          }
        }
      }

      const uniq = Array.from(new Set(recipients.map(e => e.toLowerCase())));
      if (uniq.length > 0) {
        const orgName = (opp.organizations as any)?.name || "din verksamhet";
        const orgSlug = (opp.organizations as any)?.slug || "";
        const dashUrl = orgSlug ? `https://testimony.se/min-verksamhet/${orgSlug}` : "https://testimony.se/admin/volontar";
        const safeMsg = message
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        const body = `
          <p>Någon vill hjälpa till med <strong>${opp.title}</strong> hos ${orgName}.</p>
          <p><strong>Anmälare:</strong> ${user.email || "(okänd email)"}</p>
          ${safeMsg ? `<p><strong>Hälsning:</strong><br><em>${safeMsg}</em></p>` : ""}
          <p>Logga in på testimony.se och hör av dig till personen.</p>
        `;
        await sendEmail({
          to: uniq,
          subject: `Ny volontäranmälan: ${opp.title}`,
          html: emailTemplate({
            heading: "Ny volontäranmälan",
            body,
            ctaUrl: dashUrl,
            ctaLabel: "Öppna dashboard",
          }),
        });
      }
    }
  } catch (err) {
    console.error("[volontar] email-notis misslyckades:", err);
  }

  redirect(`/volontar/${slugStr}?sent=1`);
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { slug } = await params;
  const { sent } = await searchParams;
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("volunteer_opportunities")
    .select("*, organizations(name, slug)")
    .eq("slug", slug)
    .maybeSingle();
  if (!v) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <article className="max-w-2xl mx-auto px-5 py-12">
      <div className="mb-5">
        <Link href="/volontar" className="text-sm text-stone-500 hover:text-olive-700">← Alla volontäruppgifter</Link>
      </div>
      <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">
        {v.commitment} · {v.category}
      </div>
      <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900 mb-3">{v.title}</h1>
      {v.organizations?.name && (
        <p className="text-stone-600">
          Verksamhet:{" "}
          <Link href={`/plats/${v.organizations.slug}`} className="text-olive-700 underline">
            {v.organizations.name}
          </Link>
        </p>
      )}
      {v.location && <p className="text-sm text-stone-600 mt-1"><strong>Plats:</strong> {v.location}</p>}
      {v.skills_required && <p className="text-sm text-stone-600"><strong>Kompetenser:</strong> {v.skills_required}</p>}
      {v.background_check_required && (
        <p className="mt-4 p-3 rounded bg-stone-100 border border-stone-200 text-sm text-stone-700">
          <strong>OBS:</strong> Denna uppgift kräver utdrag ur belastningsregistret. Verksamheten ansvarar för prövningen.
        </p>
      )}

      <div className="prose mt-8">
        {v.description.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
      </div>

      <section className="mt-10 pt-8 border-t border-stone-200">
        <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">Jag vill hjälpa till</h2>
        {sent ? (
          <p className="p-4 bg-olive-50 border border-olive-100 text-olive-700 rounded">
            Tack! Din intresseanmälan har skickats. Verksamheten hör av sig.
          </p>
        ) : user ? (
          <form action={applyAction} className="space-y-3">
            <input type="hidden" name="opportunity_id" value={v.id} />
            <input type="hidden" name="slug" value={v.slug} />
            <textarea
              name="message"
              rows={4}
              placeholder="Valfri hälsning till verksamheten…"
              className="w-full p-3 border border-stone-300 rounded bg-white focus:outline-none focus:border-olive-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700"
            >
              Skicka intresseanmälan
            </button>
            <p className="text-xs text-stone-500">
              Testimony.se förmedlar kontakten. Verksamheten ansvarar för rekrytering och lämplighetsprövning.
            </p>
          </form>
        ) : (
          <p className="text-stone-600">
            <Link href={`/login?next=/volontar/${v.slug}`} className="text-olive-700 underline">
              Logga in
            </Link>{" "}
            för att skicka intresseanmälan.
          </p>
        )}
      </section>
    </article>
  );
}
