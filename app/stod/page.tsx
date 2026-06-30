import { DONATION_TIERS } from "@/lib/stripe";

export const metadata = { title: "Stöd testimony.se" };

export default function Page() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <header className="text-center mb-12">
        <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">Stöd oss</div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-stone-900">
          Bidra i det fördolda.
        </h1>
        <p className="mt-4 text-stone-600 max-w-xl mx-auto text-lg leading-relaxed">
          Testimony.se är gratis att läsa och kommer alltid vara det. Om du vill stödja
          utvecklingen får du gärna göra det. Om inte – är du lika välkommen.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5 mb-12">
        {Object.entries(DONATION_TIERS).map(([key, tier]) => (
          <form key={key} action="/api/stripe/checkout" method="post" className="p-6 border border-stone-200 rounded bg-white flex flex-col">
            <input type="hidden" name="tier" value={key} />
            <div className="font-serif text-2xl font-semibold text-stone-900 mb-2">{tier.label}</div>
            <p className="text-sm text-stone-600 flex-1 mb-5">{tier.description}</p>
            <button className="w-full py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800">
              Ge
            </button>
          </form>
        ))}
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded p-6 text-sm text-stone-700 space-y-3">
        <p>
          <strong>Ingen förmån, ingen badge, ingen skillnad.</strong> Alla användare ser samma sajt
          oavsett om de ger 0 kr eller 199 kr i månaden.
        </p>
        <p className="italic font-serif">
          &ldquo;När du ger en gåva, låt inte din vänstra hand veta vad den högra gör, så att din gåva sker i det fördolda.
          Då skall din Fader, som ser i det fördolda, belöna dig.&rdquo; — Matt 6:3–4
        </p>
        <p>
          Du kan avsluta prenumerationen när som helst. Gåvan går oavkortat till drift och
          utveckling av testimony.se. Gracestack AB bokför gåvor som övrig intäkt.
        </p>
      </div>
    </div>
  );
}
