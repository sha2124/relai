"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chat } from "@/components/Chat";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Check for profile in Supabase first
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setHasProfile(true);
        } else {
          // Fall back to localStorage (quiz just completed but not yet saved to DB)
          const local = localStorage.getItem("relai-profile");
          setHasProfile(!!local);
        }
      } else {
        // Not logged in — show landing page
        setHasProfile(false);
      }

      setCheckingAuth(false);
    }

    check();
  }, []);

  if (checkingAuth || hasProfile === null) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4a7c6b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !hasProfile) {
    return <Landing onStart={() => {
      if (!user) {
        router.push("/auth");
      } else {
        router.push("/quiz");
      }
    }} />;
  }

  return <Chat />;
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-gradient-warm">
      {/* ── HERO ── */}
      <section className="min-h-[90dvh] flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4a7c6b] to-[#2d4e43] flex items-center justify-center avatar-glow mx-auto mb-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold text-[#1a1008] mb-5 tracking-tight leading-tight">
            Understand your<br />relationship patterns.
          </h1>

          <p className="text-[#8a7a66] text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            RelAI is a practice space — understand your patterns, find the words, then go have the real conversation.
          </p>

          <button type="button" onClick={onStart} className="rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-10 py-4 text-white font-semibold text-lg hover:shadow-lg transition-all">
            Take the free quiz
          </button>
          <p className="text-xs text-[#c4bbaf] mt-4">5 minutes &middot; Free account required</p>

          <div className="mt-16 grid grid-cols-3 gap-6 text-center">
            {[
              { emoji: "\uD83D\uDD17", text: "Your attachment\nstyle" },
              { emoji: "\uD83D\uDCAC", text: "How you\ncommunicate" },
              { emoji: "\u2764\uFE0F", text: "What you\nneed in love" },
            ].map((item) => (
              <div key={item.emoji}>
                <p className="text-2xl mb-1">{item.emoji}</p>
                <p className="text-xs text-[#8a7a66] leading-snug whitespace-pre-line">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT EXPERTS SAY ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">Grounded in research</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-4 tracking-tight">
            What relationship experts know
          </h2>
          <p className="text-[#8a7a66] text-center mb-12 max-w-lg mx-auto leading-relaxed">
            RelAI&apos;s coaching is built on decades of peer-reviewed research — not generic advice from the internet.
          </p>

          <div className="space-y-6">
            {[
              {
                quote: "Most relationship problems aren\u2019t about the topic you\u2019re arguing about. They\u2019re about the pattern underneath.",
                author: "Dr. John Gottman",
                role: "The Gottman Institute \u2014 40+ years of couples research",
                insight: "RelAI helps you identify your recurring conflict patterns so you can break the cycle instead of repeating it.",
              },
              {
                quote: "The quality of our relationships determines the quality of our lives. And the quality of our relationships is shaped by how well we understand ourselves.",
                author: "Esther Perel",
                role: "Psychotherapist & bestselling author",
                insight: "The onboarding quiz maps your attachment style, communication patterns, and love language \u2014 so every conversation starts from self-awareness.",
              },
              {
                quote: "Are you there for me? That\u2019s the fundamental question every partner is really asking.",
                author: "Dr. Sue Johnson",
                role: "Creator of Emotionally Focused Therapy",
                insight: "RelAI coaches you to hear the real question underneath the surface \u2014 and respond to what your partner actually needs.",
              },
            ].map((item) => (
              <div key={item.author} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
                <p className="text-[#2d2418] text-base italic leading-relaxed mb-4">&ldquo;{item.quote}&rdquo;</p>
                <p className="text-sm font-semibold text-[#1a1008]">{item.author}</p>
                <p className="text-xs text-[#8a7a66] mb-4">{item.role}</p>
                <div className="border-t border-[#e8e4df] pt-3">
                  <p className="text-sm text-[#4a7c6b] font-medium flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">{"\u2192"}</span>
                    {item.insight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-12 tracking-tight">
            Three steps to clarity
          </h2>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Take the quiz",
                description: "Answer 14 questions about how you connect, communicate, and handle conflict. Takes about 5 minutes.",
                image: "\uD83E\uDDE9",
              },
              {
                step: "02",
                title: "See your patterns",
                description: "Get your attachment style, communication profile, conflict response, and love language \u2014 with real explanations, not labels.",
                image: "\uD83D\uDD0D",
              },
              {
                step: "03",
                title: "Talk to your coach",
                description: "Chat with an AI that knows your profile. It remembers your patterns, asks the right questions, and nudges you toward real conversations.",
                image: "\uD83D\uDCAC",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-[#d4e6df] flex items-center justify-center text-xl">
                  {item.image}
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-[#4a7c6b] font-medium mb-1">Step {item.step}</p>
                  <h3 className="text-base font-semibold text-[#1a1008] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#8a7a66] leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TIERS ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">Simple pricing</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-4 tracking-tight">
            Start free. Go deeper when you&apos;re ready.
          </h2>
          <p className="text-[#8a7a66] text-center mb-12 max-w-md mx-auto">
            No credit card required. No pressure. Ever.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Free */}
            <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
              <p className="text-xs tracking-widest uppercase text-[#8a7a66] font-medium mb-2">Free</p>
              <p className="text-3xl font-semibold text-[#1a1008] mb-1">$0</p>
              <p className="text-xs text-[#8a7a66] mb-6">Forever</p>
              <ul className="space-y-3 text-sm text-[#4a3d2e]">
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Relationship quiz + profile</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> 5 coach messages / day</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Attachment style insights</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Communication profile</li>
              </ul>
            </div>

            {/* Pro */}
            <div className="bg-white border-2 border-[#4a7c6b] rounded-2xl p-6 shadow-md relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4a7c6b] text-white text-[10px] tracking-wider uppercase font-semibold px-3 py-1 rounded-full">
                Most popular
              </div>
              <p className="text-xs tracking-widest uppercase text-[#4a7c6b] font-medium mb-2">Pro</p>
              <p className="text-3xl font-semibold text-[#1a1008] mb-1">$12<span className="text-base font-normal text-[#8a7a66]">/mo</span></p>
              <p className="text-xs text-[#8a7a66] mb-6">Cancel anytime</p>
              <ul className="space-y-3 text-sm text-[#4a3d2e]">
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Everything in Free</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Unlimited coach messages</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Partner profile</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Activity &amp; bonding ideas</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Pattern insights over time</li>
              </ul>
            </div>

            {/* Premium */}
            <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
              <p className="text-xs tracking-widest uppercase text-[#8a7a66] font-medium mb-2">Premium</p>
              <p className="text-3xl font-semibold text-[#1a1008] mb-1">$24<span className="text-base font-normal text-[#8a7a66]">/mo</span></p>
              <p className="text-xs text-[#8a7a66] mb-6">For couples</p>
              <ul className="space-y-3 text-sm text-[#4a3d2e]">
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Everything in Pro</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Partner takes quiz too</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> AI-mediated sessions</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Conflict detection</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Shared relationship dashboard</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Voice sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT IT'S BASED ON ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">The science</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-12 tracking-tight">
            Built on real frameworks, not vibes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "Attachment Theory",
                author: "Bowlby & Ainsworth",
                description: "How your early bonds shape the way you connect in adult relationships \u2014 and what to do about it.",
              },
              {
                title: "The Gottman Method",
                author: "Drs. John & Julie Gottman",
                description: "The Four Horsemen, bids for connection, repair attempts \u2014 40 years of research on what makes relationships last.",
              },
              {
                title: "Emotionally Focused Therapy",
                author: "Dr. Sue Johnson",
                description: "Understanding the emotional dance between partners and breaking negative cycles of disconnection.",
              },
              {
                title: "Nonviolent Communication",
                author: "Marshall Rosenberg",
                description: "Expressing needs without blame, hearing others without defensiveness \u2014 the language of connection.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#1a1008] mb-1">{item.title}</h3>
                <p className="text-xs text-[#4a7c6b] font-medium mb-2">{item.author}</p>
                <p className="text-sm text-[#8a7a66] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">Early feedback</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-12 tracking-tight">
            What people are saying
          </h2>

          <div className="space-y-4">
            {[
              {
                text: "I always knew I was \u2018the anxious one\u2019 but seeing it laid out with actual explanations \u2014 not judgment \u2014 hit different. I finally understand why I double-text.",
                name: "M.R.",
                detail: "28, in a relationship for 3 years",
                stars: 5,
              },
              {
                text: "My husband and I took the quiz separately and compared results. We had a better conversation that night than we\u2019d had in months. We didn\u2019t even use the chat \u2014 just seeing our patterns side by side was enough.",
                name: "A.K.",
                detail: "34, married 6 years",
                stars: 5,
              },
              {
                text: "I was skeptical about talking to an AI about my relationship. But it asked me a question my therapist never has, and I sat with it for days. Something about it being low-stakes made me more honest.",
                name: "J.T.",
                detail: "31, recently out of a long-term relationship",
                stars: 5,
              },
              {
                text: "The part about how I give love vs. how I need to receive it \u2014 that gap explained like 80% of the tension with my partner. Simple insight, massive impact.",
                name: "S.L.",
                detail: "26, dating someone new",
                stars: 4,
              },
            ].map((item) => (
              <div key={item.name} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: item.stars }).map((_, i) => (
                    <span key={i} className="text-[#e8b931] text-sm">{"\u2605"}</span>
                  ))}
                </div>
                <p className="text-[#2d2418] text-sm leading-relaxed mb-4">&ldquo;{item.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-[#1a1008]">{item.name}</p>
                  <p className="text-xs text-[#8a7a66]">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR PROMISE ── */}
      <section className="px-6 py-20">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium mb-3">Our promise</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] mb-6 tracking-tight">
            We&apos;re not here to replace anyone.
          </h2>
          <p className="text-[#8a7a66] leading-relaxed mb-4">
            RelAI is a practice space, not a replacement for the people in your life. We&apos;re here to help you find the words, understand the patterns, and build the courage.
          </p>
          <p className="text-[#8a7a66] leading-relaxed mb-4">
            Then go have the real conversation.
          </p>
          <p className="text-sm text-[#8a7a66] leading-relaxed">
            If you&apos;re experiencing abuse, crisis, or a mental health emergency, please reach out to a professional. We&apos;ll always point you in the right direction.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] mb-4 tracking-tight">
            Ready to understand your patterns?
          </h2>
          <p className="text-[#8a7a66] mb-8">
            It starts with 14 questions. Free account. No credit card. Just honesty.
          </p>
          <button type="button" onClick={onStart} className="rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-10 py-4 text-white font-semibold text-lg hover:shadow-lg transition-all">
            Take the free quiz
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 text-center border-t border-[#e8e4df]/60">
        <p className="text-[10px] text-[#c4bbaf] tracking-wide">
          RelAI &middot; A practice space for your relationships &middot; Not a replacement for professional therapy
        </p>
      </footer>
    </div>
  );
}
