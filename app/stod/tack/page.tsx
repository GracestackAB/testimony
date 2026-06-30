export const metadata = { title: "Tack" };

export default function ThanksPage() {
  return (
    <div className="max-w-xl mx-auto px-5 py-20 text-center">
      <div className="text-olive-600 text-5xl mb-5">✦</div>
      <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-4">Tack.</h1>
      <p className="text-stone-700 text-lg font-serif leading-relaxed">
        Din gåva hjälper oss sprida vittnesbörd. Du får ett kvitto till din e-post.
        Du kan avsluta prenumerationen när som helst via länk i kvittot.
      </p>
    </div>
  );
}
