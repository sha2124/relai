import { createClient } from "@/lib/supabase/server";
import { getStripe, PRICE_MAP } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    // Validate Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "Stripe is not configured yet" },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const { plan, billingCycle } = await request.json();

    // Validate input
    if (!plan || !["pro", "premium"].includes(plan)) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return Response.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Look up price ID
    const priceKey = `${plan}-${billingCycle}`;
    const priceId = PRICE_MAP[priceKey];
    if (!priceId) {
      return Response.json(
        { error: "Price not configured for this plan" },
        { status: 503 }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Upsert subscription record with customer ID
      await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "free",
          status: "active",
        },
        { onConflict: "user_id" }
      );
    }

    // Create checkout session
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        billing_cycle: billingCycle,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
