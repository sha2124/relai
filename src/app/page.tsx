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
    return <Landing onStart={() => router.push("/quiz")} />;
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

          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-[#1a1008] mb-5 tracking-tight leading-tight">
            Why do you keep having<br />the same fight?
          </h1>

          <p className="text-[#8a7a66] text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            Find your relationship archetype in 5 minutes. Understand your patterns, find the words, then go have the real conversation.
          </p>

          <button type="button" onClick={onStart} className="rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-10 py-4 text-white font-semibold text-lg hover:shadow-lg transition-all">
            Discover your archetype
          </button>
          <p className="text-xs text-[#c4bbaf] mt-4">Free &middot; No account required &middot; 5 minutes</p>

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

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">How it works</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-12 tracking-tight">
            Three steps to clarity
          </h2>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Take the quiz",
                description: "Answer 14 research-backed questions about how you connect, communicate, and handle conflict. No account needed.",
                image: "\uD83E\uDDE9",
              },
              {
                step: "02",
                title: "Meet your archetype",
                description: "Get a named relationship archetype — like The Peacekeeper or The Lone Wolf — with your strengths, blind spots, and a personalized growth edge.",
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

      {/* ── SAMPLE ARCHETYPE PREVIEW ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">What you&apos;ll discover</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-4 tracking-tight">
            Your relationship archetype, revealed.
          </h2>
          <p className="text-[#8a7a66] text-center mb-12 max-w-lg mx-auto leading-relaxed">
            Not a vague label. A real portrait of how you love — with the science to back it up.
          </p>

          {/* Sample archetype card */}
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-8 shadow-md text-center">
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "linear-gradient(135deg, #c4849c20, #c4849c40)", border: "2px solid #c4849c30" }}
              >
                <span className="text-3xl">{"\uD83D\uDD0D"}</span>
              </div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#c4849c] font-medium mb-2">Sample archetype</p>
              <h3 className="font-heading text-2xl font-semibold text-[#1a1008] mb-2">The Seeker</h3>
              <p className="text-sm text-[#8a7a66] italic mb-5">&ldquo;Always reaching for deeper connection&rdquo;</p>
              <div className="grid grid-cols-2 gap-3 text-left mb-5">
                <div className="bg-[#f0ece4] rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#4a7c6b] font-medium mb-1">Strengths</p>
                  <p className="text-xs text-[#2d2418]">Emotional attunement, deep intimacy, commitment</p>
                </div>
                <div className="bg-[#f0ece4] rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#c45c5c] font-medium mb-1">Blind spots</p>
                  <p className="text-xs text-[#2d2418]">Over-reading signals, reassurance-seeking</p>
                </div>
              </div>
              <div className="bg-[#4a7c6b08] border border-[#4a7c6b20] rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#4a7c6b] font-medium mb-1">Growth edge</p>
                <p className="text-xs text-[#2d2418] italic">&ldquo;Build your own emotional home base...&rdquo;</p>
              </div>
            </div>
            <p className="text-center text-xs text-[#c4bbaf] mt-4">One of 14 possible archetypes</p>
          </div>
        </div>
      </section>

      {/* ── WHAT EXPERTS SAY ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">Grounded in research</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-4 tracking-tight">
            Built on real science, not vibes
          </h2>
          <p className="text-[#8a7a66] text-center mb-12 max-w-lg mx-auto leading-relaxed">
            Every question, archetype, and coaching response is grounded in decades of peer-reviewed relationship research.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {[
              {
                title: "Attachment Theory",
                author: "Bowlby & Ainsworth",
                description: "How your early bonds shape the way you connect in adult relationships.",
              },
              {
                title: "The Gottman Method",
                author: "Drs. John & Julie Gottman",
                description: "The Four Horsemen, bids for connection, repair attempts — 40 years of research.",
              },
              {
                title: "Emotionally Focused Therapy",
                author: "Dr. Sue Johnson",
                description: "Breaking negative cycles of disconnection between partners.",
              },
              {
                title: "Nonviolent Communication",
                author: "Marshall Rosenberg",
                description: "Expressing needs without blame, hearing others without defensiveness.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#1a1008] mb-1">{item.title}</h3>
                <p className="text-xs text-[#4a7c6b] font-medium mb-2">{item.author}</p>
                <p className="text-sm text-[#8a7a66] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Expert quotes */}
          <div className="space-y-4">
            {[
              {
                quote: "Most relationship problems aren\u2019t about the topic you\u2019re arguing about. They\u2019re about the pattern underneath.",
                author: "Dr. John Gottman",
                role: "40+ years of couples research",
              },
              {
                quote: "The quality of our relationships determines the quality of our lives.",
                author: "Esther Perel",
                role: "Psychotherapist & bestselling author",
              },
              {
                quote: "Are you there for me? That\u2019s the fundamental question every partner is really asking.",
                author: "Dr. Sue Johnson",
                role: "Creator of Emotionally Focused Therapy",
              },
            ].map((item) => (
              <div key={item.author} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm">
                <p className="font-heading text-[#2d2418] text-base italic leading-relaxed mb-3">&ldquo;{item.quote}&rdquo;</p>
                <p className="text-sm font-semibold text-[#1a1008]">{item.author}</p>
                <p className="text-xs text-[#8a7a66]">{item.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">Early feedback</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-12 tracking-tight">
            What people are saying
          </h2>

          <div className="space-y-4">
            {[
              {
                text: "I got The Peacekeeper and it was scarily accurate. I\u2019ve been suppressing what I need for years to keep the peace. Seeing it written out — not as a flaw, but as a pattern I can change — that hit hard.",
                name: "M.R.",
                detail: "28, in a relationship for 3 years",
                archetype: "The Peacekeeper",
              },
              {
                text: "My husband and I took the quiz separately and compared archetypes. We had a better conversation that night than we\u2019d had in months. Just seeing our patterns side by side was enough.",
                name: "A.K.",
                detail: "34, married 6 years",
                archetype: "The Steady Flame",
              },
              {
                text: "I was skeptical about talking to an AI about my relationship. But it asked me a question my therapist never has, and I sat with it for days. Something about it being low-stakes made me more honest.",
                name: "J.T.",
                detail: "31, recently out of a long-term relationship",
                archetype: "The Lone Wolf",
              },
              {
                text: "The part about how I give love vs. how I need to receive it — that gap explained like 80% of the tension with my partner. Simple insight, massive impact.",
                name: "S.L.",
                detail: "26, dating someone new",
                archetype: "The Tender Heart",
              },
            ].map((item) => (
              <div key={item.name} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] tracking-wider uppercase font-medium text-[#4a7c6b] bg-[#d4e6df] px-2 py-0.5 rounded-full">
                    {item.archetype}
                  </span>
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

      {/* ── FAQ ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">Common questions</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-12 tracking-tight">
            Before you start
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Is this therapy?",
                a: "No. RelAI is a relationship coaching tool — a practice space for understanding your patterns and finding the right words. It\u2019s informed by therapy frameworks (Gottman, attachment theory, EFT) but it\u2019s not a substitute for a licensed professional.",
              },
              {
                q: "Do I need to create an account?",
                a: "Not to take the quiz. You\u2019ll see your archetype and full results for free, no sign-up needed. Creating an account saves your profile and unlocks the AI coach chat.",
              },
              {
                q: "Is my data private?",
                a: "Yes. Your conversations and profile are private. We never sell your data, share it with partners, or use it for advertising. Each user can only see their own data.",
              },
              {
                q: "What if I\u2019m in crisis?",
                a: "If you\u2019re experiencing abuse, suicidal thoughts, or a mental health emergency, please contact a crisis helpline. RelAI will always point you to professional resources — it\u2019s built into the system.",
              },
              {
                q: "Can my partner take it too?",
                a: "Yes! Each partner takes the quiz separately and gets their own archetype. Comparing results side by side often sparks the most meaningful conversations. Partner linking is coming soon.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-semibold text-[#1a1008] mb-2">{item.q}</h3>
                <p className="text-sm text-[#8a7a66] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TIERS ── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium text-center mb-3">Simple pricing</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#1a1008] text-center mb-4 tracking-tight">
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
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Quiz + archetype (no signup)</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> 5 coach messages / day</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Full trait breakdown</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Growth edge & blind spots</li>
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
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Guided exercises</li>
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
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Shared dashboard</li>
                <li className="flex gap-2"><span className="text-[#4a7c6b]">{"\u2713"}</span> Voice sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-20 bg-white/40">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#1a1008] mb-4 tracking-tight">
            Ready to meet your archetype?
          </h2>
          <p className="text-[#8a7a66] mb-8">
            14 questions. 5 minutes. No account needed. Just honesty.
          </p>
          <button type="button" onClick={onStart} className="rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-10 py-4 text-white font-semibold text-lg hover:shadow-lg transition-all">
            Discover your archetype
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 text-center border-t border-[#e8e4df]/60">
        <p className="text-[10px] text-[#c4bbaf] tracking-wide">
          RelAI &middot; Relationship coaching, not therapy &middot; Your data stays private
        </p>
      </footer>
    </div>
  );
}
