import { NextResponse } from "next/server";
import { stripe, DONATION_TIERS, type DonationTier } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const tier = String(form.get("tier") || "") as DonationTier;
  const t = DONATION_TIERS[tier];
  if (!t || !t.priceId) {
    return NextResponse.json({ error: "Okänt belopp eller Stripe ej konfigurerad." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const origin = new URL(request.url).origin;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: t.priceId, quantity: 1 }],
    success_url: `${siteUrl}/stod/tack?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/stod`,
    customer_email: user?.email,
    metadata: {
      user_id: user?.id || "",
      tier,
    },
    subscription_data: {
      metadata: {
        user_id: user?.id || "",
        tier,
      },
    },
    allow_promotion_codes: false,
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
