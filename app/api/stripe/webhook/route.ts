import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook ej konfigurerad." }, { status: 400 });
  }
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = await createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.metadata?.user_id as string) || null;
      const tier = (session.metadata?.tier as string) || null;
      if (session.subscription) {
        await supabase.from("donations").upsert({
          user_id: userId,
          stripe_customer_id: (session.customer as string) || null,
          stripe_subscription_id: session.subscription as string,
          tier,
          amount_sek_cents: session.amount_total || null,
          status: "active",
        }, { onConflict: "stripe_subscription_id" });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from("donations").upsert({
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer as string,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        tier: (sub.metadata?.tier as string) || null,
        user_id: (sub.metadata?.user_id as string) || null,
      }, { onConflict: "stripe_subscription_id" });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
