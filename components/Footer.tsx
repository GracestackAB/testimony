import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function Footer() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <footer className="border-t border-stone-200 bg-stone-50 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-10 text-sm text-stone-600 grid md:grid-cols-3 gap-8">
        <div>
          <div className="font-serif text-lg text-stone-900 mb-2">testimony.se</div>
          <p className="leading-relaxed max-w-sm">{t.footer.tagline}</p>
        </div>
        <div>
          <div className="font-medium text-stone-800 mb-2">{t.footer.explore}</div>
          <ul className="space-y-1">
            <li><Link href="/vittnesbord">{t.nav.testimonies}</Link></li>
            <li><Link href="/bonesvar">{t.nav.prayerAnswers}</Link></li>
            <li><Link href="/boneamnen">{t.nav.prayerRequests}</Link></li>
            <li><Link href="/plats">{t.nav.places}</Link></li>
            <li><Link href="/volontar">{t.nav.volunteer}</Link></li>
            <li><Link href="/sok">{t.nav.network}</Link></li>
            <li><Link href="/flode">{t.nav.myFeed}</Link></li>
            <li><Link href="/grupper">{t.nav.groups}</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium text-stone-800 mb-2">{t.footer.about}</div>
          <ul className="space-y-1">
            <li><Link href="/stod">{t.footer.support}</Link></li>
            <li><Link href="/om">{t.footer.about}</Link></li>
            <li><Link href="/integritet">{t.footer.privacy}</Link></li>
            <li><Link href="/villkor">{t.footer.terms}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-200 py-4 text-center text-xs text-stone-500 italic font-serif">
        &ldquo;{t.footer.quote}&rdquo;
      </div>
    </footer>
  );
}
