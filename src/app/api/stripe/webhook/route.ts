import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe, getPlanFromPriceId } from "@/lib/stripe";

export const runtime = "nodejs";

// Admin client that bypasses RLS for webhook writes
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    console.error("Webhook signature verification failed");
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        const billingCycle = session.metadata?.billing_cycle;

        if (!userId || !plan) break;

        // Get subscription details from Stripe
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          // In Stripe v20+, current_period_end is on subscription items
          const itemPeriodEnd = sub.items.data[0]?.current_period_end;
          if (itemPeriodEnd) {
            currentPeriodEnd = new Date(itemPeriodEnd * 1000).toISOString();
          }
        }

        await supabaseAdmin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId || null,
            plan,
            billing_cycle: billingCycle || "monthly",
            status: "active",
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Determine plan from price
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);

        const status = mapStripeStatus(subscription.status);

        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: plan || undefined,
            status,
            stripe_subscription_id: subscription.id,
            current_period_end: subscription.items.data[0]?.current_period_end
              ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return Response.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return Response.json({ received: true });
}

function mapStripeStatus(
  stripeStatus: string
): "active" | "canceled" | "past_due" | "trialing" {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}
