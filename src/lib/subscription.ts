import { createClient } from "@/lib/supabase/client";

export type Plan = "free" | "pro" | "premium";

export interface SubscriptionInfo {
  plan: Plan;
  status: string;
  billingCycle: string | null;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
}

export async function getUserSubscription(): Promise<SubscriptionInfo | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, billing_cycle, stripe_customer_id, current_period_end")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  return {
    plan: data.plan as Plan,
    status: data.status,
    billingCycle: data.billing_cycle,
    stripeCustomerId: data.stripe_customer_id,
    currentPeriodEnd: data.current_period_end,
  };
}

export async function getUserPlan(): Promise<Plan> {
  const sub = await getUserSubscription();
  if (!sub || sub.status !== "active") return "free";
  return sub.plan;
}
