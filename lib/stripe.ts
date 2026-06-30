import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy", {
  apiVersion: "2024-04-10" as Stripe.LatestApiVersion,
  httpClient: Stripe.createFetchHttpClient(),
});

export const DONATION_TIERS = {
  small: {
    label: "19,90 kr / månad",
    description: "Det lilla som alla kan ge – priset på en kaffe.",
    priceId: process.env.STRIPE_PRICE_SMALL,
  },
  medium: {
    label: "99 kr / månad",
    description: "En tydligare investering i sajtens utveckling.",
    priceId: process.env.STRIPE_PRICE_MEDIUM,
  },
  large: {
    label: "199 kr / månad",
    description: "Betydelsefullt stöd för drift och tillväxt.",
    priceId: process.env.STRIPE_PRICE_LARGE,
  },
} as const;

export type DonationTier = keyof typeof DONATION_TIERS;
