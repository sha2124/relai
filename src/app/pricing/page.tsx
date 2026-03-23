"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "Forever",
    description: "Start understanding your patterns",
    features: [
      "Quiz + archetype (no signup)",
      "5 coach messages / day",
      "Full trait breakdown",
      "Growth edge & blind spots",
      "Shareable archetype card",
    ],
    cta: "Current plan",
    ctaStyle: "border" as const,
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "Go deeper with unlimited coaching",
    features: [
      "Everything in Free",
      "Unlimited coach messages",
      "Partner profile & linking",
      "Guided exercises library",
      "Relationship journal",
      "Progress tracking dashboard",
      "Pattern insights over time",
    ],
    cta: "Upgrade to Pro",
    ctaStyle: "primary" as const,
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$24",
    period: "/month",
    description: "For couples who want to grow together",
    features: [
      "Everything in Pro",
      "Partner takes quiz too",
      "AI-mediated sessions",
      "Conflict detection",
      "Shared couple dashboard",
      "Voice sessions",
      "Priority support",
    ],
    cta: "Upgrade to Premium",
    ctaStyle: "accent" as const,
    highlight: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-3xl mx-auto stagger-in">
          {/* Header */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-[#8a7a66] hover:text-[#4a7c6b] transition-colors mb-8 flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>

          <div className="text-center mb-10">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#1a1008] mb-3 tracking-tight">
              Simple, honest pricing
            </h1>
            <p className="text-[#8a7a66] text-base leading-relaxed max-w-md mx-auto">
              Start free. Go deeper when you&apos;re ready. No credit card required.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#4a7c6b] text-white"
                  : "bg-white/60 border border-[#e8e4df] text-[#8a7a66]"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                billingCycle === "yearly"
                  ? "bg-[#4a7c6b] text-white"
                  : "bg-white/60 border border-[#e8e4df] text-[#8a7a66]"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-[10px] bg-[#d4e6df] text-[#2d4e43] px-1.5 py-0.5 rounded-full font-semibold">
                Save 20%
              </span>
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const displayPrice = billingCycle === "yearly" && plan.id !== "free"
                ? `$${Math.round(parseInt(plan.price.replace("$", "")) * 0.8)}`
                : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 shadow-sm relative ${
                    plan.highlight
                      ? "bg-white border-2 border-[#4a7c6b] shadow-md"
                      : "bg-white/70 backdrop-blur-sm border border-[#e8e4df]"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4a7c6b] text-white text-[10px] tracking-wider uppercase font-semibold px-3 py-1 rounded-full">
                      Most popular
                    </div>
                  )}

                  <p className="text-xs tracking-widest uppercase text-[#8a7a66] font-medium mb-2">
                    {plan.name}
                  </p>
                  <p className="text-3xl font-semibold text-[#1a1008] mb-1">
                    {displayPrice}
                    {plan.period !== "Forever" && (
                      <span className="text-base font-normal text-[#8a7a66]">
                        {billingCycle === "yearly" ? "/mo" : plan.period}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#8a7a66] mb-6">
                    {plan.period === "Forever"
                      ? "Forever"
                      : billingCycle === "yearly"
                        ? "Billed yearly"
                        : "Cancel anytime"}
                  </p>

                  <ul className="space-y-3 text-sm text-[#4a3d2e] mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-[#4a7c6b] shrink-0">{"\u2713"}</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      if (plan.id === "free") return;
                      // TODO: Stripe checkout
                      alert("Stripe integration coming soon! For now, all features are free.");
                    }}
                    disabled={plan.id === "free"}
                    className={`w-full rounded-xl px-5 py-3.5 text-sm font-semibold transition-all ${
                      plan.ctaStyle === "primary"
                        ? "bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] text-white hover:shadow-md"
                        : plan.ctaStyle === "accent"
                          ? "bg-gradient-to-r from-[#c4849c] to-[#a06b7f] text-white hover:shadow-md"
                          : "border border-[#e8e4df] bg-white/50 text-[#8a7a66] cursor-default"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="mt-16 max-w-lg mx-auto">
            <h2 className="font-heading text-xl font-semibold text-[#1a1008] text-center mb-8">
              Common questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Can I try everything for free first?",
                  a: "Yes! During our early access period, all features are unlocked for free. We'll give you plenty of notice before paid plans go live.",
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We'll accept all major credit cards, Apple Pay, and Google Pay through Stripe. Your payment info is never stored on our servers.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Absolutely. No contracts, no penalties. Cancel from your account settings and you'll keep access until the end of your billing period.",
                },
                {
                  q: "Do you offer refunds?",
                  a: "Yes, we offer a 14-day money-back guarantee on all paid plans. No questions asked.",
                },
              ].map((item) => (
                <div key={item.q} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#1a1008] mb-1.5">{item.q}</h3>
                  <p className="text-sm text-[#8a7a66] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e8e4df]/60">
        <p className="text-[10px] text-[#c4bbaf] tracking-wide">
          RelAI &middot; Relationship coaching, not therapy &middot; Your data stays private
        </p>
      </footer>
    </div>
  );
}
