import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BibleEngagement } from "@/components/bible/BibleEngagement";
import { DailyBibleActions } from "@/components/bible/DailyBibleActions";
import { ParallelBiblePanel } from "@/components/bible/ParallelBiblePanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dagens bibeltext" };

export default async function Page({ params }: { params: Promise<{ datum: string }> }) {
  const { datum } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: entry } = await supabase
    .from("daily_bible")
    .select("*")
    .eq("for_date", datum)
    .eq("status", "published")
    .single();

  if (!entry) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <header className="mb-10 text-center">
          <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">Tolkning &amp; undervisning</div>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">Dagens bibeltext</h1>
        </header>
        <div className="text-center py-12">
          <p className="text-stone-500 italic mb-6">Ingen text publicerad för detta datum.</p>
          <Link href="/dagens-bibeltext" className="text-olive-700 underline hover:text-olive-600">
            ← Tillbaka till dagens text
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <header className="mb-8">
        <Link href="/dagens-bibeltext" className="inline-flex items-center gap-1 text-sm text-olive-700 hover:text-olive-600 mb-6">
          ← Tillbaka till dagens text
        </Link>
        <div className="text-stone-500 uppercase tracking-widest text-xs mb-2">Tolkning &amp; undervisning</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">Dagens bibeltext</h1>
      </header>

      <article>
        <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">
          {new Date(entry.for_date).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-5">{entry.reference}</h2>
        <blockquote className="border-l-4 border-olive-500 pl-5 italic font-serif text-lg text-stone-700 mb-6">
          {entry.text_body}
        </blockquote>
        <ParallelBiblePanel reference={entry.reference} />
        <div className="prose">
          {entry.explanation.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
        </div>
        <DailyBibleActions
          bibleId={entry.id}
          reference={entry.reference}
          textBody={entry.text_body}
          explanation={entry.explanation}
          isAuthed={Boolean(user)}
        />
        <BibleEngagement bibleId={entry.id} />
      </article>
    </div>
  );
}
