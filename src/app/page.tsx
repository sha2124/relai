"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chat } from "@/components/Chat";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";
import NudgeBell from "@/components/NudgeBell";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [archetype, setArchetype] = useState<Archetype | null>(null);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, attachment_style, communication_style, conflict_response")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setHasProfile(true);
          setProfileName(profile.name || "");
          if (profile.attachment_style && profile.communication_style && profile.conflict_response) {
            setArchetype(
              getArchetype(
                (profile.attachment_style as { primary: string }).primary,
                (profile.communication_style as { primary: string }).primary,
                (profile.conflict_response as { primary: string }).primary
              )
            );
          }
        } else {
          const local = localStorage.getItem("relai-profile");
          setHasProfile(!!local);
        }
      } else {
        setHasProfile(false);
      }

      setCheckingAuth(false);
    }

    check();
  }, []);

  if (checkingAuth || hasProfile === null) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !hasProfile) {
    return <Landing onStart={() => router.push("/quiz")} />;
  }

  return <Dashboard user={user} name={profileName} archetype={archetype} />;
}

/* ------------------------------------------------------------------ */
/*  Dashboard (logged-in home)                                         */
/* ------------------------------------------------------------------ */

function Dashboard({ user, name, archetype }: { user: User; name: string; archetype: Archetype | null }) {
  const router = useRouter();
  const [showChat, setShowChat] = useState(() => {
    if (typeof window !== "undefined" && localStorage.getItem("relai-exercise-prompt")) return true;
    return false;
  });
  const [moodSaved, setMoodSaved] = useState<string | null>(null);
  const [pendingMood, setPendingMood] = useState<string | null>(null);

  // Check for pending exercise/tool prompt on mount (handles full-page navigations)
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("relai-exercise-prompt") && !showChat) {
      setShowChat(true);
    }
  }, [showChat]);
  const [moodNote, setMoodNote] = useState("");

  async function saveMoodCheck(moodLabel: string, note?: string) {
    const supabase = createClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const moodMap: Record<string, string> = { RADIANT: "great", MILD: "good", HAZY: "okay", STORMY: "hard" };
    const content = note
      ? `Mood check: feeling ${moodLabel.toLowerCase()} today. ${note}`
      : `Mood check: feeling ${moodLabel.toLowerCase()} today.`;
    await supabase.from("journal_entries").insert({
      user_id: u.id,
      content,
      mood: moodMap[moodLabel] || "okay",
      tags: ["mood-check"],
    });
    setMoodSaved(moodLabel);
  }

  if (showChat) return <Chat />;

  const firstName = name.split(" ")[0] || "there";

  return (
    <div className="bg-surface min-h-[100dvh]">
      {/* ── Nav ── */}
      <nav className="bg-surface-container-lowest/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_20px_40px_rgba(141,72,55,0.05)]">
        <div className="flex justify-between items-center w-full px-6 md:px-8 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-bold tracking-tight text-primary font-heading">RelAI</div>
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => setShowChat(true)} className="font-heading font-medium text-sm tracking-tight text-primary border-b-2 border-primary pb-1">Coach</button>
            <button onClick={() => router.push("/translate")} className="font-heading font-medium text-sm tracking-tight text-outline hover:text-primary transition-colors">Translate</button>
            <button onClick={() => router.push("/repair")} className="font-heading font-medium text-sm tracking-tight text-outline hover:text-primary transition-colors">Repair</button>
            <button onClick={() => router.push("/exercises")} className="font-heading font-medium text-sm tracking-tight text-outline hover:text-primary transition-colors">Library</button>
            <button onClick={() => router.push("/journal")} className="font-heading font-medium text-sm tracking-tight text-outline hover:text-primary transition-colors">Journal</button>
            <button onClick={() => router.push("/profile")} className="font-heading font-medium text-sm tracking-tight text-outline hover:text-primary transition-colors">Account</button>
          </div>
          <div className="flex items-center space-x-2">
            <NudgeBell />
            <button onClick={() => router.push("/health-score")} className="p-2 hover:bg-primary-container/20 rounded-full transition-all text-primary" title="Health Score">
              <span className="material-symbols-outlined">monitor_heart</span>
            </button>
            <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-primary-container/20 rounded-full transition-all text-primary" title="Progress">
              <span className="material-symbols-outlined">bar_chart</span>
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container bg-primary-container/30 flex items-center justify-center cursor-pointer" onClick={() => router.push("/profile")}>
              {archetype ? (
                <span className="text-lg">{archetype.emoji}</span>
              ) : (
                <span className="material-symbols-outlined text-on-primary-container text-xl">person</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-12">
        {/* ── Hero ── */}
        <header className="relative mb-20">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-secondary-container/30 blob-shape -z-10 blur-3xl" />
          <div className="absolute top-10 -right-10 w-80 h-80 bg-tertiary-container/20 blob-shape -z-10 blur-3xl" />
          <div className="max-w-2xl">
            <span className="text-primary font-bold tracking-widest text-xs uppercase mb-4 block">WELCOME BACK</span>
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-on-surface tracking-tight mb-6">
              Ready to bloom<br />today, <span className="text-primary">{firstName}?</span>
            </h1>
            <p className="text-xl text-on-surface-variant font-light max-w-lg">
              Let&apos;s brighten up your relationships. Your daily radiant hearth is ready for some nurturing.
            </p>
          </div>
        </header>

        {/* ── Bento Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-24">
          {/* Relationship Sun Check */}
          <section className="md:col-span-7 bg-surface-container-low rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-[96px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>light_mode</span>
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl font-heading font-bold text-on-surface mb-2">Relationship Sun Check</h2>
              <p className="text-on-surface-variant mb-8">How is the connection atmosphere today?</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: "wb_sunny", label: "RADIANT", color: "text-secondary", fill: true },
                  { icon: "partly_cloudy_day", label: "MILD", color: "text-tertiary", fill: false },
                  { icon: "cloud", label: "HAZY", color: "text-outline", fill: false },
                  { icon: "thunderstorm", label: "STORMY", color: "text-primary-dim", fill: false },
                ].map((mood) => (
                  <button
                    key={mood.label}
                    onClick={() => {
                      if (moodSaved) return;
                      setPendingMood(mood.label);
                    }}
                    className={`flex flex-col items-center justify-center w-24 h-32 bg-surface-container-lowest rounded-xl border-2 transition-all ${
                      moodSaved === mood.label
                        ? "border-secondary-container bg-secondary-container/10"
                        : pendingMood === mood.label
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-secondary-container"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-3xl mb-3 ${mood.color}`} style={mood.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}>{mood.icon}</span>
                    <span className="text-xs font-bold tracking-wide">{moodSaved === mood.label ? "LOGGED ✓" : mood.label}</span>
                  </button>
                ))}
              </div>
              {pendingMood && !moodSaved && (
                <div className="mt-6 bg-surface-container-lowest rounded-xl p-4 border border-surface-variant msg-enter">
                  <textarea
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value.slice(0, 300))}
                    placeholder="Add a note about how you're feeling... (optional)"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-surface-variant bg-transparent px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { saveMoodCheck(pendingMood, moodNote.trim() || undefined); setPendingMood(null); setMoodNote(""); }}
                      className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg font-bold text-xs tracking-wide hover:opacity-90 transition-opacity"
                    >
                      {moodNote.trim() ? "SAVE WITH NOTE" : "SAVE"}
                    </button>
                    <button
                      onClick={() => { setPendingMood(null); setMoodNote(""); }}
                      className="px-4 py-2.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Growth Journal */}
          <section className="md:col-span-5 bg-tertiary-container rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-on-tertiary-container">edit_note</span>
              </div>
              <h2 className="text-2xl font-heading font-bold text-on-tertiary-container mb-2">Growth Journal</h2>
              <p className="text-on-tertiary-container/80 text-sm mb-6 leading-relaxed">
                &ldquo;Small acts of vulnerability are the seeds of deep-rooted trust.&rdquo;
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/journal")}
              className="w-full bg-on-tertiary-container text-surface-container-lowest py-4 rounded-full font-bold text-sm tracking-wide hover:opacity-90 transition-opacity"
            >
              WRITE ENTRY
            </button>
          </section>

          {/* ── Relationship Tools ── */}
          <section className="md:col-span-12">
            <h2 className="text-2xl font-heading font-bold text-on-surface mb-6">Relationship Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => router.push("/translate")}
                className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant text-left card-hover group"
              >
                <div className="w-12 h-12 bg-primary-container/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl text-primary">translate</span>
                </div>
                <h3 className="font-heading font-bold text-on-surface mb-1">Conflict Translator</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Rewrite a heated message using nonviolent communication — before you hit send.</p>
              </button>
              <button
                type="button"
                onClick={() => router.push("/repair")}
                className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant text-left card-hover group"
              >
                <div className="w-12 h-12 bg-secondary-container/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl text-secondary">healing</span>
                </div>
                <h3 className="font-heading font-bold text-on-surface mb-1">Repair Script</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Get the exact words to say after a fight — personalized to both your archetypes.</p>
              </button>
              <button
                type="button"
                onClick={() => router.push("/insights")}
                className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant text-left card-hover group"
              >
                <div className="w-12 h-12 bg-tertiary-container/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl text-tertiary">psychology</span>
                </div>
                <h3 className="font-heading font-bold text-on-surface mb-1">Your Patterns</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">See what your conversations reveal — recurring themes, growth, and blind spots.</p>
              </button>
              <button
                type="button"
                onClick={() => router.push("/health-score")}
                className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant text-left card-hover group"
              >
                <div className="w-12 h-12 bg-[#4a7c59]/15 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl text-[#4a7c59]">monitor_heart</span>
                </div>
                <h3 className="font-heading font-bold text-on-surface mb-1">Health Score</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Weekly 0-100 score across 5 dimensions — track how your relationship is growing.</p>
              </button>
              <button
                type="button"
                onClick={() => router.push("/nudges")}
                className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant text-left card-hover group"
              >
                <div className="w-12 h-12 bg-secondary-container/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl text-secondary">notifications_active</span>
                </div>
                <h3 className="font-heading font-bold text-on-surface mb-1">Daily Nudges</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Personalized follow-ups, check-ins, and encouragement based on your activity.</p>
              </button>
            </div>
          </section>

          {/* ── Daily Insight (Flo-style rotating content) ── */}
          <section className="md:col-span-12 bg-surface-container-lowest rounded-2xl p-8 border border-surface-variant">
            <DailyInsight />
          </section>

          {/* Warm-up Exercises */}
          <section className="md:col-span-12 bg-surface-container-high rounded-2xl p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
              <div>
                <h2 className="text-3xl font-heading font-bold text-on-surface mb-2">Warm-up Exercises</h2>
                <p className="text-on-surface-variant">Daily tools to keep the communication flow vibrant.</p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/exercises")}
                className="mt-4 md:mt-0 text-primary font-bold flex items-center gap-2 group"
              >
                View all tools <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: "psychiatry", title: "Soft Startup", desc: "Raise an issue without starting a fight. Rewrite complaints as gentle requests.", time: "10 MINS", timeIcon: "schedule", bg: "bg-secondary-container", iconColor: "text-on-secondary-container", timeColor: "text-secondary" },
                { icon: "favorite", title: "Daily Appreciation", desc: "Notice one specific thing your partner did and tell them. The simplest habit that transforms relationships.", time: "2 MINS", timeIcon: "bolt", bg: "bg-primary-container", iconColor: "text-on-primary-container", timeColor: "text-primary" },
                { icon: "handshake", title: "Bids for Connection", desc: "Train yourself to notice and respond to the small moments that build trust.", time: "ALL DAY", timeIcon: "menu_book", bg: "bg-surface-variant", iconColor: "text-on-surface-variant", timeColor: "text-on-surface-variant" },
              ].map((ex) => (
                <div key={ex.title} className="bg-surface-container-lowest p-6 rounded-xl transition-transform hover:-translate-y-1 cursor-pointer" onClick={() => router.push("/exercises")}>
                  <div className={`w-10 h-10 ${ex.bg} rounded-lg flex items-center justify-center mb-4`}>
                    <span className={`material-symbols-outlined ${ex.iconColor}`}>{ex.icon}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{ex.title}</h3>
                  <p className="text-sm text-on-surface-variant mb-4">{ex.desc}</p>
                  <div className={`flex items-center gap-2 text-xs font-bold ${ex.timeColor} uppercase tracking-widest`}>
                    <span className="material-symbols-outlined text-sm">{ex.timeIcon}</span> {ex.time}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured Quote */}
          <section className="md:col-span-12 flex justify-center py-12">
            <div className="relative max-w-2xl w-full">
              <div className="bg-primary/5 absolute inset-0 blob-shape transform rotate-12 -z-10 scale-110" />
              <div className="bg-tertiary-container/40 p-12 md:p-16 rounded-2xl text-center relative z-10">
                <span className="material-symbols-outlined text-5xl text-primary mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                <h3 className="text-2xl md:text-3xl font-heading font-bold text-on-tertiary-container leading-snug">
                  &ldquo;Connection isn&apos;t about solving every problem; it&apos;s about making sure no problem is faced alone.&rdquo;
                </h3>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-container/40 border-2 border-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">psychology_alt</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-on-surface">Dr. Sue Johnson</p>
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest">EMOTIONALLY FOCUSED THERAPY</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Partner Link CTA ── */}
        <div className="mb-24">
          <div className="bg-surface-container-low rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-secondary-container/40 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-secondary">favorite</span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-heading font-bold text-on-surface mb-2">Link with your partner</h3>
              <p className="text-on-surface-variant text-sm">See how your archetypes complement each other. Invite your partner to take the quiz.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/partner")}
              className="shrink-0 bg-primary text-on-primary px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:opacity-90 transition-opacity"
            >
              INVITE PARTNER
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface-container-high/50 w-full rounded-t-[3rem] mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-12 py-16 max-w-7xl mx-auto space-y-6 md:space-y-0">
          <div className="flex flex-col space-y-4 items-center md:items-start">
            <div className="text-lg font-bold text-primary font-heading">RelAI</div>
            <p className="text-xs text-outline max-w-xs text-center md:text-left">
              Nurturing connections through radiant coaching. Not a replacement for licensed therapy.
            </p>
          </div>
          <div className="flex space-x-8">
            <button onClick={() => router.push("/pricing")} className="text-xs text-outline hover:text-primary transition-colors">Pricing</button>
            <button onClick={() => router.push("/exercises")} className="text-xs text-outline hover:text-primary transition-colors">Exercises</button>
            <button onClick={() => router.push("/partner")} className="text-xs text-outline hover:text-primary transition-colors">Partner</button>
          </div>
        </div>
      </footer>

      {/* ── FAB ── */}
      <button
        type="button"
        onClick={() => setShowChat(true)}
        className="fixed bottom-10 right-10 bg-gradient-to-br from-primary to-primary-container text-on-primary w-16 h-16 rounded-full shadow-2xl flex items-center justify-center group hover:scale-105 active:scale-95 transition-all z-40"
      >
        <span className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform">chat_bubble</span>
      </button>

      {/* ── Mobile Nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest/90 backdrop-blur-xl border-t border-surface-variant z-30 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around py-2">
          {[
            { icon: "home", label: "Home", active: true, action: () => {} },
            { icon: "translate", label: "Translate", active: false, action: () => router.push("/translate") },
            { icon: "healing", label: "Repair", active: false, action: () => router.push("/repair") },
            { icon: "person", label: "Account", active: false, action: () => router.push("/profile") },
          ].map((tab) => (
            <button key={tab.label} onClick={tab.action} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${tab.active ? "text-primary" : "text-outline"}`}>
              <span className="material-symbols-outlined text-xl" style={tab.active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Daily Insight — Flo-style rotating content cards                   */
/* ------------------------------------------------------------------ */

const DAILY_INSIGHTS = [
  {
    type: "Conversation Starter",
    icon: "chat_bubble",
    color: "#8d4837",
    content: "\"What's something I do that makes you feel loved — that you've never told me about?\"",
    source: "Gottman Love Maps",
    tip: "Ask this tonight. The answer might surprise you.",
  },
  {
    type: "Relationship Myth",
    icon: "lightbulb",
    color: "#6b8f82",
    content: "Myth: Happy couples don't fight.\nReality: They fight just as much — they just repair faster. It's not about avoiding conflict, it's about what you do in the first 3 minutes and the 20 minutes after.",
    source: "Gottman Institute — 40 years of research",
    tip: null,
  },
  {
    type: "Micro-Skill",
    icon: "psychology",
    color: "#81502b",
    content: "Try \"The Story I'm Making Up\" — when you catch yourself assuming your partner's intentions, say: \"The story I'm making up right now is that you don't care about this.\" It's vulnerable AND honest.",
    source: "Brené Brown — Rising Strong",
    tip: "This works because it owns your interpretation instead of stating it as fact.",
  },
  {
    type: "Did You Know?",
    icon: "science",
    color: "#5c7a9c",
    content: "Couples who \"turn toward\" each other's bids for connection 86% of the time stayed married. Those who turned toward only 33% of the time divorced. A bid can be as small as \"Look at that bird.\"",
    source: "Gottman Institute — Bids for Connection",
    tip: "Today, try to notice 3 bids from your partner and turn toward each one.",
  },
  {
    type: "Partner Challenge",
    icon: "emoji_events",
    color: "#c45c5c",
    content: "The 6-Second Kiss: Tonight, instead of a peck goodbye or goodnight, try a real 6-second kiss. Gottman calls it \"a kiss with potential\" — long enough to feel something, short enough to fit into real life.",
    source: "Drs. John & Julie Gottman",
    tip: "6 seconds is longer than you think. Count it.",
  },
  {
    type: "Attachment Insight",
    icon: "link",
    color: "#3a6355",
    content: "When your partner pulls away, your instinct to pursue harder is your attachment system activating — not evidence that something is wrong. The paradox: the security you're seeking can only come from tolerating the uncertainty.",
    source: "Dr. Stan Tatkin — Wired for Love",
    tip: "Next time you feel the urge to over-text, pause for 20 minutes first. See what happens.",
  },
  {
    type: "Weekly Win Prompt",
    icon: "celebration",
    color: "#8d4837",
    content: "Name one moment this week where your relationship felt good — even if it was small. Not a grand gesture, but a moment of real connection. A laugh. A look. A hand on the shoulder.",
    source: "Gottman — Small Things Often",
    tip: "Write it in your journal. Wins you name are wins you remember.",
  },
];

function DailyInsight() {
  // Rotate daily based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const insight = DAILY_INSIGHTS[dayOfYear % DAILY_INSIGHTS.length];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${insight.color}15` }}
        >
          <span className="material-symbols-outlined" style={{ color: insight.color }}>{insight.icon}</span>
        </div>
        <div>
          <p className="text-xs tracking-widest uppercase font-medium" style={{ color: insight.color }}>
            {insight.type}
          </p>
          <p className="text-[10px] text-on-surface-variant">Updates daily</p>
        </div>
      </div>

      <p className="text-on-surface text-base leading-relaxed whitespace-pre-line mb-4">
        {insight.content}
      </p>

      <div className="flex items-center justify-between">
        <p className="text-xs text-on-surface-variant italic">{insight.source}</p>
      </div>

      {insight.tip && (
        <div className="mt-4 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
          <p className="text-sm text-on-surface">
            <span className="font-medium text-primary">Try this: </span>
            {insight.tip}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-gradient-warm">
      {/* ── HERO ── */}
      <section className="min-h-[90dvh] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-tertiary/5 rounded-full blur-3xl" />

        <div className="max-w-xl relative z-10 stagger-in">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center avatar-glow mx-auto mb-8 float">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="badge bg-primary-container/30 text-on-primary-container mx-auto mb-6">
            Free &middot; 5 minutes &middot; No account needed
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-on-surface mb-5 tracking-tight leading-tight">
            Why do you keep having<br />the same fight?
          </h1>

          <p className="text-on-surface-variant text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            Find your relationship archetype in 5 minutes. Understand your patterns, find the words, then go have the real conversation.
          </p>

          <button type="button" onClick={onStart} className="rounded-xl bg-gradient-to-r from-primary to-primary-dim px-10 py-4 text-on-primary font-semibold text-lg btn-glow">
            Discover your archetype
          </button>

          <p className="mt-4 text-xs text-on-surface-variant">
            14 questions &middot; 5 minutes &middot; Based on 40+ years of relationship research
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { emoji: "\uD83D\uDD17", text: "Your attachment\nstyle" },
              { emoji: "\uD83D\uDCAC", text: "How you\ncommunicate" },
              { emoji: "\u2764\uFE0F", text: "What you\nneed in love" },
            ].map((item) => (
              <div key={item.emoji} className="glass-card p-4 cursor-default">
                <p className="text-2xl mb-1.5">{item.emoji}</p>
                <p className="text-xs text-on-surface-variant leading-snug whitespace-pre-line font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-20 bg-section-alt">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">How it works</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-12 tracking-tight">
            Three steps to clarity
          </h2>

          <div className="space-y-8">
            {[
              { step: "01", title: "Take the quiz", description: "Answer 14 research-backed questions about how you connect, communicate, and handle conflict. No account needed.", icon: "quiz" },
              { step: "02", title: "Meet your archetype", description: "Get a named relationship archetype — like The Peacekeeper or The Lone Wolf — with your strengths, blind spots, and a personalized growth edge.", icon: "person_search" },
              { step: "03", title: "Talk to your coach", description: "Chat with an AI that knows your profile. It remembers your patterns, asks the right questions, and nudges you toward real conversations.", icon: "chat" },
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-primary-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">{item.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-primary font-medium mb-1">Step {item.step}</p>
                  <h3 className="text-base font-semibold text-on-surface mb-1">{item.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Who it&apos;s for</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-12 tracking-tight">
            Whether you&apos;re working on it alone or together
          </h2>

          <div className="space-y-4">
            {[
              { icon: "🔄", title: "Couples stuck in the same argument", description: "You love each other but keep hitting the same wall. RelAI helps you see the pattern underneath — and gives you new words to break it." },
              { icon: "🧭", title: "Individuals navigating relationship anxiety", description: "You overthink texts, fear abandonment, or shut down when things get close. Your archetype shows you why — and what to do differently." },
              { icon: "🌱", title: "People who want to grow, not just survive", description: "Your relationship isn't in crisis — you just know it could be deeper. RelAI is a daily practice space for couples who want to keep getting better." },
              { icon: "💔", title: "Anyone processing a breakup or pattern", description: "Understanding your relationship patterns after a breakup is one of the most powerful things you can do before the next one." },
            ].map((item) => (
              <div key={item.title} className="glass-card p-6 flex gap-4 items-start">
                <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <h3 className="text-base font-semibold text-on-surface mb-1">{item.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY RELAI (differentiation) ── */}
      <section className="px-6 py-20 bg-section-alt">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Why RelAI</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-4 tracking-tight">
            Not a chatbot. Not a therapist. A practice space.
          </h2>
          <p className="text-on-surface-variant text-center mb-12 max-w-lg mx-auto leading-relaxed">
            Most relationship apps either give generic advice or try to replace therapy. RelAI does neither.
          </p>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-variant">
                  <th className="text-left py-3 pr-4 text-on-surface-variant font-medium"></th>
                  <th className="py-3 px-3 text-center text-on-surface-variant font-medium text-xs uppercase tracking-wider">Traditional therapy</th>
                  <th className="py-3 px-3 text-center text-on-surface-variant font-medium text-xs uppercase tracking-wider">Generic AI chatbot</th>
                  <th className="py-3 px-3 text-center font-bold text-primary text-xs uppercase tracking-wider">RelAI</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                {[
                  { feature: "Available 24/7", therapy: false, chatbot: true, relai: true },
                  { feature: "Knows your patterns", therapy: true, chatbot: false, relai: true },
                  { feature: "Evidence-based methods", therapy: true, chatbot: false, relai: true },
                  { feature: "Affordable", therapy: false, chatbot: true, relai: true },
                  { feature: "Partner can join", therapy: true, chatbot: false, relai: true },
                  { feature: "Pushes you toward real conversations", therapy: true, chatbot: false, relai: true },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-surface-variant/50">
                    <td className="py-3 pr-4 text-sm">{row.feature}</td>
                    <td className="py-3 px-3 text-center">{row.therapy ? <span className="text-primary">&#10003;</span> : <span className="text-outline">&#10007;</span>}</td>
                    <td className="py-3 px-3 text-center">{row.chatbot ? <span className="text-primary">&#10003;</span> : <span className="text-outline">&#10007;</span>}</td>
                    <td className="py-3 px-3 text-center">{row.relai ? <span className="text-primary font-bold">&#10003;</span> : <span className="text-outline">&#10007;</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-on-surface-variant mt-8">
            RelAI is a coaching tool, not a replacement for licensed therapy. If you&apos;re in crisis, we&apos;ll always point you to professional help.
          </p>
        </div>
      </section>

      {/* ── SAMPLE ARCHETYPE PREVIEW ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">What you&apos;ll discover</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-4 tracking-tight">
            Your relationship archetype, revealed.
          </h2>
          <p className="text-on-surface-variant text-center mb-12 max-w-lg mx-auto leading-relaxed">
            Not a vague label. A real portrait of how you love — with the science to back it up.
          </p>

          <div className="max-w-md mx-auto">
            <div className="bg-surface-container-lowest backdrop-blur-sm border border-surface-variant rounded-2xl p-8 shadow-md text-center">
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "linear-gradient(135deg, #81502b20, #81502b40)", border: "2px solid #81502b30" }}
              >
                <span className="text-3xl">{"\uD83D\uDD0D"}</span>
              </div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-tertiary font-medium mb-2">Sample archetype</p>
              <h3 className="font-heading text-2xl font-bold text-on-surface mb-2">The Seeker</h3>
              <p className="text-sm text-on-surface-variant italic mb-5">&ldquo;Always reaching for deeper connection&rdquo;</p>
              <div className="grid grid-cols-2 gap-3 text-left mb-5">
                <div className="bg-surface-container rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-medium mb-1">Strengths</p>
                  <p className="text-xs text-on-surface">Emotional attunement, deep intimacy, commitment</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-error font-medium mb-1">Blind spots</p>
                  <p className="text-xs text-on-surface">Over-reading signals, reassurance-seeking</p>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-primary font-medium mb-1">Growth edge</p>
                <p className="text-xs text-on-surface italic">&ldquo;Build your own emotional home base...&rdquo;</p>
              </div>
            </div>
            <p className="text-center text-xs text-outline-variant mt-4">One of 14 possible archetypes</p>
          </div>
        </div>
      </section>

      {/* ── WHAT EXPERTS SAY ── */}
      <section className="px-6 py-20 bg-section-alt">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Grounded in research</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-4 tracking-tight">
            Built on real science, not vibes
          </h2>
          <p className="text-on-surface-variant text-center mb-12 max-w-lg mx-auto leading-relaxed">
            Every question, archetype, and coaching response is grounded in decades of peer-reviewed relationship research.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {[
              { title: "Attachment Theory", author: "Bowlby & Ainsworth", description: "How your early bonds shape the way you connect in adult relationships." },
              { title: "The Gottman Method", author: "Drs. John & Julie Gottman", description: "The Four Horsemen, bids for connection, repair attempts — 40 years of research." },
              { title: "Emotionally Focused Therapy", author: "Dr. Sue Johnson", description: "Breaking negative cycles of disconnection between partners." },
              { title: "Nonviolent Communication", author: "Marshall Rosenberg", description: "Expressing needs without blame, hearing others without defensiveness." },
            ].map((item) => (
              <div key={item.title} className="glass-card p-5">
                <h3 className="text-base font-semibold text-on-surface mb-1">{item.title}</h3>
                <p className="text-xs text-primary font-medium mb-2">{item.author}</p>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {[
              { quote: "Most relationship problems aren\u2019t about the topic you\u2019re arguing about. They\u2019re about the pattern underneath.", author: "Dr. John Gottman", role: "40+ years of couples research" },
              { quote: "The quality of our relationships determines the quality of our lives.", author: "Esther Perel", role: "Psychotherapist & bestselling author" },
              { quote: "Are you there for me? That\u2019s the fundamental question every partner is really asking.", author: "Dr. Sue Johnson", role: "Creator of Emotionally Focused Therapy" },
            ].map((item) => (
              <div key={item.author} className="glass-card p-5">
                <p className="font-heading text-on-surface text-base italic leading-relaxed mb-3">&ldquo;{item.quote}&rdquo;</p>
                <p className="text-sm font-semibold text-on-surface">{item.author}</p>
                <p className="text-xs text-on-surface-variant">{item.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW YOUR COACH WORKS ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Your AI coach</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-4 tracking-tight">
            Not a generic chatbot. A coach that knows you.
          </h2>
          <p className="text-on-surface-variant text-center mb-12 max-w-lg mx-auto leading-relaxed">
            RelAI learns your patterns, teaches you concrete skills from leading relationship experts, and always pushes you toward real conversations.
          </p>

          <div className="space-y-4">
            {[
              {
                skill: "The Story I\u2019m Making Up",
                expert: "Bren\u00e9 Brown",
                description: "When you\u2019re catastrophizing about your partner\u2019s intentions, your coach teaches you to say: \u201CThe story I\u2019m making up is that you don\u2019t care about this\u201D \u2014 honest about your fear while admitting you might be wrong.",
              },
              {
                skill: "The Attachment Question",
                expert: "Dr. Sue Johnson",
                description: "Every fight is really asking: \u201CAre you there for me?\u201D Your coach helps you find the real question underneath the surface argument about dishes or money.",
              },
              {
                skill: "Small Things Often",
                expert: "Drs. John & Julie Gottman",
                description: "Your coach tracks your daily check-ins and nudges you toward the micro-gestures that predict relationship success: a 6-second kiss, a specific appreciation, turning toward a bid.",
              },
              {
                skill: "Becoming an Expert on Your Partner",
                expert: "Dr. Stan Tatkin",
                description: "Your coach helps you build an \u201Cowner\u2019s manual\u201D for your partner \u2014 what soothes them, what triggers them, what they need in the first 30 seconds when you walk in the door.",
              },
            ].map((item) => (
              <div key={item.skill} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-on-surface">{item.skill}</h3>
                  <span className="text-[10px] tracking-wider uppercase font-medium text-primary bg-primary-container/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {item.expert}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-on-surface-variant mt-8">
            Every coaching response is grounded in peer-reviewed research — never generic advice.
          </p>
        </div>
      </section>

      {/* ── DAILY PRACTICE (Flo-style engagement hook) ── */}
      <section className="px-6 py-20 bg-section-alt">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Daily practice</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-4 tracking-tight">
            5 minutes a day that actually change things
          </h2>
          <p className="text-on-surface-variant text-center mb-12 max-w-lg mx-auto leading-relaxed">
            Like a fitness app for your relationship. Log how you&apos;re feeling, get a personalized insight, and try one small thing with your partner.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "Check in",
                description: "Rate your connection today. Over time, your coach spots patterns you can\u2019t see yourself.",
                icon: "wb_sunny",
              },
              {
                step: "2",
                title: "Get your insight",
                description: "A daily tip, conversation starter, or micro-skill — personalized to your archetype and current patterns.",
                icon: "lightbulb",
              },
              {
                step: "3",
                title: "Try it IRL",
                description: "Every insight comes with one specific thing to try with your partner today. Not homework — a nudge.",
                icon: "favorite",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-primary-container/30 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary">{item.icon}</span>
                </div>
                <p className="text-[10px] tracking-widest uppercase text-primary font-medium mb-2">Step {item.step}</p>
                <h3 className="text-base font-semibold text-on-surface mb-2">{item.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Early feedback</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-12 tracking-tight">
            What people are saying
          </h2>

          <div className="space-y-4">
            {[
              { text: "I got The Peacekeeper and nearly cried. I\u2019ve spent 3 years swallowing what I need to avoid conflict. Seeing it laid out — not as weakness, but as a pattern I learned to survive — was the first time I felt understood without judgment. I brought it up with my partner that same night.", name: "M.R.", detail: "28, together 3 years", archetype: "The Peacekeeper" },
              { text: "We almost didn\u2019t make it to our anniversary. Then we took the quiz separately. Seeing our archetypes side by side — his avoidance, my anxiety — we finally understood we weren\u2019t fighting about dishes. We were fighting about safety. That one insight changed everything.", name: "A.K.", detail: "34, married 6 years", archetype: "The Steady Flame" },
              { text: "I was skeptical. An AI for relationships? But it asked me something no one ever has: \u2018What are you really afraid will happen if you let someone close?\u2019 I sat with that for three days. I\u2019m still sitting with it. That\u2019s worth more than any advice.", name: "J.T.", detail: "31, processing a breakup", archetype: "The Lone Wolf" },
              { text: "I give love by doing things. My partner needs words. That gap — which the quiz mapped out in literally 5 minutes — explained years of \u2018I do so much and you don\u2019t even notice.\u2019 Now we know what to look for.", name: "S.L.", detail: "26, new relationship", archetype: "The Tender Heart" },
            ].map((item) => (
              <div key={item.name} className="glass-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] tracking-wider uppercase font-medium text-primary bg-primary-container/30 px-2 py-0.5 rounded-full">
                    {item.archetype}
                  </span>
                </div>
                <p className="text-on-surface text-sm leading-relaxed mb-4">&ldquo;{item.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-20 bg-section-alt">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Common questions</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-12 tracking-tight">
            Before you start
          </h2>

          <div className="space-y-4">
            {[
              { q: "Is this therapy?", a: "No. RelAI is a relationship coaching tool \u2014 a practice space for understanding your patterns and finding the right words. It\u2019s informed by therapy frameworks (Gottman, attachment theory, EFT) but it\u2019s not a substitute for a licensed professional. If you need therapy, we\u2019ll tell you." },
              { q: "Do I need to create an account?", a: "Not to take the quiz. You\u2019ll see your archetype and full results for free, no sign-up needed. Creating an account saves your profile and unlocks the AI coach, journal, exercises, and partner linking." },
              { q: "Is my data private?", a: "Yes. Your conversations and profile are encrypted and private. We never sell your data, share it with partners, or use it for advertising. Each user can only access their own data. Your partner cannot see your private conversations with the coach." },
              { q: "Can my partner take it too?", a: "Yes! Each partner takes the quiz separately and gets their own archetype. You can link profiles to see how your patterns complement (and clash with) each other. This is where the biggest breakthroughs happen." },
              { q: "What if we\u2019re in a really rough patch?", a: "RelAI can help you understand your patterns and find better words for hard conversations. But if you\u2019re experiencing abuse, safety concerns, or a mental health crisis, please reach out to a professional. Our coach will always direct you to crisis resources when needed." },
              { q: "How is this different from just asking ChatGPT?", a: "Generic AI gives generic advice. RelAI knows your attachment style, communication patterns, and conflict tendencies. It uses evidence-based frameworks (not just vibes) and is designed to push you toward real conversations \u2014 not to become your emotional support chatbot." },
            ].map((item) => (
              <div key={item.q} className="glass-card p-6">
                <h3 className="text-base font-semibold text-on-surface mb-2">{item.q}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TIERS ── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Simple pricing</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-4 tracking-tight">
            Start free. Go deeper when you&apos;re ready.
          </h2>
          <p className="text-on-surface-variant text-center mb-12 max-w-md mx-auto">
            No credit card required. No pressure. Ever.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-6">
              <p className="text-xs tracking-widest uppercase text-outline font-medium mb-2">Free</p>
              <p className="text-3xl font-bold text-on-surface mb-1">$0</p>
              <p className="text-xs text-on-surface-variant mb-6">Forever</p>
              <ul className="space-y-3 text-sm text-on-surface">
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Quiz + archetype (no signup)</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> 5 coach messages / day</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Full trait breakdown</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Growth edge & blind spots</li>
              </ul>
            </div>

            <div className="bg-surface-container-lowest border-2 border-primary rounded-2xl p-6 shadow-md relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] tracking-wider uppercase font-semibold px-3 py-1 rounded-full">
                Most popular
              </div>
              <p className="text-xs tracking-widest uppercase text-primary font-medium mb-2">Pro</p>
              <p className="text-3xl font-bold text-on-surface mb-1">$12<span className="text-base font-normal text-on-surface-variant">/mo</span></p>
              <p className="text-xs text-on-surface-variant mb-6">Cancel anytime</p>
              <ul className="space-y-3 text-sm text-on-surface">
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Everything in Free</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Unlimited coach messages</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Partner profile</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Guided exercises</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Pattern insights over time</li>
              </ul>
            </div>

            <div className="glass-card p-6">
              <p className="text-xs tracking-widest uppercase text-outline font-medium mb-2">Premium</p>
              <p className="text-3xl font-bold text-on-surface mb-1">$24<span className="text-base font-normal text-on-surface-variant">/mo</span></p>
              <p className="text-xs text-on-surface-variant mb-6">For couples</p>
              <ul className="space-y-3 text-sm text-on-surface">
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Everything in Pro</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Partner takes quiz too</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> AI-mediated sessions</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Conflict detection</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Shared dashboard</li>
                <li className="flex gap-2"><span className="text-primary">{"\u2713"}</span> Voice sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST & SAFETY ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-medium text-center mb-3">Trust &amp; safety</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface text-center mb-12 tracking-tight">
            Your relationship data is sacred
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "lock",
                title: "Private by default",
                description: "Your conversations, journal entries, and profile are encrypted and private. Your partner cannot see your coach sessions.",
              },
              {
                icon: "shield",
                title: "Safety guardrails",
                description: "If our coach detects signs of abuse, crisis, or danger, it immediately provides professional resources — not more advice.",
              },
              {
                icon: "visibility_off",
                title: "We never sell your data",
                description: "Your relationship data is never sold, shared with advertisers, or used for anything other than your coaching experience.",
              },
              {
                icon: "health_and_safety",
                title: "Clear scope boundaries",
                description: "RelAI is a coaching tool, not therapy. We\u2019re transparent about our limits and will tell you when you need a licensed professional.",
              },
            ].map((item) => (
              <div key={item.title} className="glass-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary">{item.icon}</span>
                  <h3 className="text-base font-semibold text-on-surface">{item.title}</h3>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-20 bg-section-alt">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-on-surface mb-4 tracking-tight">
            Ready to meet your archetype?
          </h2>
          <p className="text-on-surface-variant mb-8">
            14 questions. 5 minutes. No account needed. Just honesty.
          </p>
          <button type="button" onClick={onStart} className="rounded-xl bg-gradient-to-r from-primary to-primary-dim px-10 py-4 text-on-primary font-semibold text-lg btn-glow">
            Discover your archetype
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-surface-container-high/50 w-full rounded-t-[3rem] mt-12">
        <div className="flex flex-col md:flex-row justify-between items-start w-full px-12 py-16 max-w-7xl mx-auto space-y-8 md:space-y-0">
          <div className="flex flex-col space-y-4 items-center md:items-start">
            <div className="text-lg font-bold text-primary font-heading">RelAI</div>
            <p className="text-xs text-outline max-w-xs text-center md:text-left leading-relaxed">
              AI relationship coaching grounded in Gottman Method, Attachment Theory, and Emotionally Focused Therapy. A practice space for real conversations &mdash; not a replacement for licensed therapy.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end space-y-4">
            <div className="flex space-x-6">
              <span className="text-xs text-outline hover:text-primary transition-colors cursor-pointer">Privacy</span>
              <span className="text-xs text-outline hover:text-primary transition-colors cursor-pointer">Terms</span>
            </div>
            <div className="text-[10px] text-outline/60 text-center md:text-right space-y-1">
              <p>If you&apos;re in crisis: <span className="text-on-surface-variant">1-800-799-7233</span> (National DV Hotline)</p>
              <p>Crisis Text Line: text <span className="text-on-surface-variant">HOME</span> to <span className="text-on-surface-variant">741741</span></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
