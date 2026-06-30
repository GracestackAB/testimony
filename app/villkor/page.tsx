export const metadata = { title: "Användarvillkor" };

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-14 prose">
      <h1>Användarvillkor</h1>
      <p>
        Genom att använda testimony.se godkänner du dessa villkor. Sajten drivs av Gracestack AB.
      </p>
      <h2>Vad du får göra</h2>
      <ul>
        <li>Läsa allt offentligt innehåll utan inloggning</li>
        <li>Logga in och dela egna vittnesbörd, böneämnen och bönesvar</li>
        <li>Reagera på andras innehåll (&ldquo;Jag ber&rdquo;, &ldquo;Halleluja&rdquo;)</li>
        <li>Söka volontäruppgifter och skicka intresseanmälningar</li>
      </ul>
      <h2>Vad du inte får göra</h2>
      <ul>
        <li>Publicera innehåll som kränker tredje parts integritet</li>
        <li>Ge medicinska råd eller påståenden om helande som ersättning för vård</li>
        <li>Spam, hets, trakasserier eller kommersiell marknadsföring</li>
        <li>Utge dig för att vara någon annan</li>
      </ul>
      <h2>Volontärförmedling</h2>
      <p>
        Testimony.se förmedlar kontakt mellan volontärer och verksamheter. Respektive verksamhet ansvarar
        för rekrytering, lämplighets­prövning och eventuell kontroll av belastnings­register.
      </p>
      <h2>Moderation</h2>
      <p>
        Vi förbehåller oss rätten att avvisa, redigera eller ta bort innehåll som bryter mot dessa villkor.
      </p>
    </div>
  );
}
