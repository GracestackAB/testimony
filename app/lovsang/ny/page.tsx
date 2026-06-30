import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewWorshipSongForm } from "@/components/worship/NewWorshipSongForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dela en lovsång" };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/lovsang/ny");
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900">Dela en lovsång</h1>
        <p className="text-sm text-stone-600 mt-1">
          Berätta vilken sång eller psalm som lyfter ditt hjärta. Den granskas av en moderator innan den publiceras.
        </p>
      </header>
      <NewWorshipSongForm />
    </div>
  );
}
