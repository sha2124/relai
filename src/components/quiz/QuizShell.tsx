"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, SECTIONS } from "@/lib/quiz/questions";
import { computeProfile, type UserProfile } from "@/lib/quiz/compute-profile";
import { createClient } from "@/lib/supabase/client";
import { QuizCard } from "./QuizCard";
import { NameInput } from "./NameInput";

export function QuizShell() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);

  // Persist answers to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("relai-quiz");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed.answers ?? {});
        setStep(parsed.step ?? 0);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem("relai-quiz", JSON.stringify({ answers, step }));
    }
  }, [answers, step]);

  const question = QUESTIONS[step];
  const section = SECTIONS.find((s) => s.id === question?.section);
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  async function saveProfileToSupabase(profile: UserProfile) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Not logged in — skip DB save

    await supabase.from("profiles").upsert({
      user_id: user.id,
      name: profile.name,
      relationship_status: profile.relationshipStatus,
      relationship_length: profile.relationshipLength,
      attachment_style: profile.attachmentStyle,
      communication_style: profile.communicationStyle,
      conflict_response: profile.conflictResponse,
      love_language: profile.loveLanguage,
      goal: profile.goal,
      goal_label: profile.goalLabel,
      scores: profile.scores,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  function finishQuiz(finalAnswers: Record<string, string>) {
    const profile = computeProfile(finalAnswers, QUESTIONS);
    localStorage.setItem("relai-profile", JSON.stringify(profile));
    localStorage.removeItem("relai-quiz");
    saveProfileToSupabase(profile);

    // Show analyzing animation, then navigate
    setAnalyzing(true);
    setTimeout(() => {
      // Check if there's a pending partner invite to return to
      const pendingInvite = localStorage.getItem("relai-partner-invite");
      if (pendingInvite) {
        localStorage.removeItem("relai-partner-invite");
        router.push(`/partner/join/${pendingInvite}`);
      } else {
        router.push("/profile");
      }
    }, 3200);
  }

  function handleAnswer(optionId: string) {
    const newAnswers = { ...answers, [question.id]: optionId };
    setAnswers(newAnswers);

    // Auto-advance after a short delay
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) {
        setStep(step + 1);
      } else {
        finishQuiz(newAnswers);
      }
    }, 300);
  }

  function handleNameSubmit(name: string) {
    const newAnswers = { ...answers, name };
    setAnswers(newAnswers);
    finishQuiz(newAnswers);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  // ── Analyzing screen ──
  if (analyzing) {
    return (
      <AnalyzingScreen />
    );
  }

  if (!question) return null;

  // Last question is the name input
  if (question.id === "name") {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex flex-col">
        <QuizHeader
          progress={progress}
          sectionLabel={section?.label ?? ""}
          sectionColor={section?.color ?? "#8d4837"}
          onBack={handleBack}
          step={step}
        />
        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <NameInput
            question={question.question}
            subtitle={question.subtitle}
            onSubmit={handleNameSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-warm flex flex-col">
      <QuizHeader
        progress={progress}
        sectionLabel={section?.label ?? ""}
        sectionColor={section?.color ?? "#8d4837"}
        onBack={handleBack}
        step={step}
      />
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <QuizCard
          key={question.id}
          question={question}
          selectedId={answers[question.id]}
          onSelect={handleAnswer}
        />
      </div>
    </div>
  );
}

function AnalyzingScreen() {
  const [phase, setPhase] = useState(0);
  const messages = [
    "Understanding your attachment patterns...",
    "Mapping your communication style...",
    "Discovering your archetype...",
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000);
    const t2 = setTimeout(() => setPhase(2), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gradient-warm flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#8d4837]/[0.06] blur-3xl animate-pulse-soft pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#705900]/[0.05] blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="max-w-sm w-full text-center relative z-10 animate-fade-up">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#8d4837] to-[#6d2e20] flex items-center justify-center mx-auto mb-8 analyzing-pulse shadow-warm-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-semibold text-[#312e29] mb-6">
          Analyzing your patterns...
        </h2>

        {/* Cycling messages */}
        <div className="h-6 mb-8 relative">
          {messages.map((msg, i) => (
            <p
              key={i}
              className="text-sm text-[#7a766f] absolute inset-x-0 transition-all duration-500"
              style={{
                opacity: phase === i ? 1 : 0,
                transform: phase === i ? "translateY(0)" : phase > i ? "translateY(-8px)" : "translateY(8px)",
              }}
            >
              {msg}
            </p>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#e2dcd1] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full analyzing-bar"
            style={{ background: "linear-gradient(90deg, #8d4837, #81502b, #705900)" }}
          />
        </div>

        {/* Pulsing dots */}
        <div className="flex justify-center gap-2 mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8d4837] typing-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#8d4837] typing-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#8d4837] typing-dot" />
        </div>
      </div>
    </div>
  );
}

function QuizHeader({
  progress,
  sectionLabel,
  sectionColor,
  onBack,
  step,
}: {
  progress: number;
  sectionLabel: string;
  sectionColor: string;
  onBack: () => void;
  step: number;
}) {
  return (
    <header className="shrink-0 px-6 pt-5 pb-4 glass-warm">
      <div className="max-w-lg mx-auto">
        {/* Back + Section */}
        <div className="flex items-center justify-between mb-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={onBack}
              className="text-[#7a766f] hover:text-[#312e29] transition-colors text-sm flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}
          <span
            className="text-xs font-medium tracking-wide uppercase"
            style={{ color: sectionColor }}
          >
            {sectionLabel}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#e2dcd1] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, #8d4837, #81502b, #705900)`,
            }}
          />
        </div>

        {/* Progress percentage */}
        <p className="text-[10px] text-[#b1ada5] text-right mt-1.5 tabular-nums">
          {Math.round(progress)}% complete
        </p>
      </div>
    </header>
  );
}
