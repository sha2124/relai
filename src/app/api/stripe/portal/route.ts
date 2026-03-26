import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "Stripe is not configured yet" },
        { status: 503 }
      );
    }

    const stripe = getStripe();

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Look up customer ID
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return Response.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // Create portal session
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/pricing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return Response.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
