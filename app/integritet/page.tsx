export const metadata = { title: "Integritet & GDPR" };

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-14 prose">
      <h1>Integritet &amp; GDPR</h1>
      <p><strong>Personuppgiftsansvarig:</strong> Gracestack AB (org.nr 559550-5644).</p>
      <h2>Vad vi samlar in</h2>
      <ul>
        <li>E-postadress (för inloggning via magic link)</li>
        <li>Valfritt namn, bio och församlings­tillhörighet (på din profil)</li>
        <li>Innehåll du själv publicerar (vittnesbörd, böneämnen, bönesvar)</li>
        <li>Tekniska loggar för säkerhet</li>
      </ul>
      <h2>Dina rättigheter</h2>
      <p>
        Du kan när som helst begära utdrag, rättelse eller radering av dina uppgifter genom att mejla
        <a href="mailto:kim@gracestack.se"> kim@gracestack.se</a>.
      </p>
      <h2>Moderation</h2>
      <p>
        Allt användar­genererat innehåll granskas av moderator innan publicering. Vi kan avvisa eller
        redigera inlägg som bryter mot tredje parts integritet, innehåller medicinska påståenden utan
        grund, eller på annat sätt inte passar på plattformen.
      </p>
      <h2>Känsliga sammanhang</h2>
      <p>
        På Café Liv och liknande verksamheter möter vi människor i sårbara situationer. För bilder och
        vittnesbörd därifrån krävs tydligt, skriftligt samtycke. Inga igenkännbara ansikten på gäster
        utan uttryckligt medgivande.
      </p>
      <h2>Stripe &amp; gåvor</h2>
      <p>
        Betalningar hanteras av Stripe. Vi lagrar enbart ditt Stripe kund-ID och prenumerations-ID för
        att du själv ska kunna hantera din prenumeration. Inga kortuppgifter lagras av oss.
      </p>
    </div>
  );
}
