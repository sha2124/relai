import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const PRICE_MAP: Record<string, string | undefined> = {
  "pro-monthly": process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  "pro-yearly": process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  "premium-monthly": process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  "premium-yearly": process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
};

export function getPlanFromPriceId(priceId: string): string | null {
  const priceMap: Record<string, string> = {};

  if (process.env.STRIPE_PRO_MONTHLY_PRICE_ID)
    priceMap[process.env.STRIPE_PRO_MONTHLY_PRICE_ID] = "pro";
  if (process.env.STRIPE_PRO_YEARLY_PRICE_ID)
    priceMap[process.env.STRIPE_PRO_YEARLY_PRICE_ID] = "pro";
  if (process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID)
    priceMap[process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID] = "premium";
  if (process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID)
    priceMap[process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID] = "premium";

  return priceMap[priceId] || null;
}
