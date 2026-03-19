"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, SECTIONS } from "@/lib/quiz/questions";
import { computeProfile } from "@/lib/quiz/compute-profile";
import { QuizCard } from "./QuizCard";
import { NameInput } from "./NameInput";

export function QuizShell() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

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

  function handleAnswer(optionId: string) {
    const newAnswers = { ...answers, [question.id]: optionId };
    setAnswers(newAnswers);

    // Auto-advance after a short delay
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) {
        setStep(step + 1);
      } else {
        // Quiz complete — compute profile and navigate
        const profile = computeProfile(newAnswers, QUESTIONS);
        localStorage.setItem("relai-profile", JSON.stringify(profile));
        localStorage.removeItem("relai-quiz");
        router.push("/profile");
      }
    }, 300);
  }

  function handleNameSubmit(name: string) {
    const newAnswers = { ...answers, name };
    setAnswers(newAnswers);
    const profile = computeProfile(newAnswers, QUESTIONS);
    localStorage.setItem("relai-profile", JSON.stringify(profile));
    localStorage.removeItem("relai-quiz");
    router.push("/profile");
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  if (!question) return null;

  // Last question is the name input
  if (question.id === "name") {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex flex-col">
        <QuizHeader
          progress={progress}
          sectionLabel={section?.label ?? ""}
          sectionColor={section?.color ?? "#4a7c6b"}
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
        sectionColor={section?.color ?? "#4a7c6b"}
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
    <header className="shrink-0 px-6 pt-5 pb-4">
      <div className="max-w-lg mx-auto">
        {/* Back + Section */}
        <div className="flex items-center justify-between mb-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={onBack}
              className="text-[#8a7a66] hover:text-[#1a1008] transition-colors text-sm flex items-center gap-1"
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
        <div className="h-1.5 bg-[#e8e4df] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, #4a7c6b, #2d4e43)`,
            }}
          />
        </div>
      </div>
    </header>
  );
}
