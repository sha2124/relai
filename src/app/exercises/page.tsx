"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXERCISES, CATEGORIES, DIFFICULTY_LABELS, type Exercise } from "@/lib/exercises";

export default function ExercisesPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activeCategory === "all"
    ? EXERCISES
    : EXERCISES.filter((e) => e.category === activeCategory);

  function startExercise(exercise: Exercise) {
    // Store the prompt and navigate to chat
    localStorage.setItem("relai-exercise-prompt", exercise.chatPrompt);
    router.push("/");
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto stagger-in">
          {/* Header */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors mb-8 flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back to chat
          </button>

          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
            Guided Exercises
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            Evidence-based exercises from Gottman, EFT, and attachment theory. Practice on your own or with your AI coach.
          </p>

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-[#8d4837] text-white"
                    : "bg-white/60 border border-[#e2dcd1] text-[#7a766f] hover:bg-white hover:text-[#312e29]"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Exercise cards */}
          <div className="space-y-4">
            {filtered.map((exercise) => {
              const isExpanded = expandedId === exercise.id;
              return (
                <div
                  key={exercise.id}
                  className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl shadow-sm overflow-hidden transition-all"
                >
                  {/* Card header */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
                    className="w-full text-left p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 h-12 w-12 rounded-xl bg-[#fce4dc] flex items-center justify-center text-xl">
                        {exercise.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-[#312e29]">
                            {exercise.name}
                          </h3>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            className={`shrink-0 text-[#b1ada5] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          >
                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <p className="text-sm text-[#7a766f] italic">{exercise.tagline}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] tracking-wider uppercase font-medium text-[#8d4837] bg-[#fce4dc] px-2 py-0.5 rounded-full">
                            {exercise.duration}
                          </span>
                          <span className="text-[10px] tracking-wider uppercase font-medium text-[#7a766f] bg-[#ede7dd] px-2 py-0.5 rounded-full">
                            {DIFFICULTY_LABELS[exercise.difficulty]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-[#e2dcd1]/50 pt-4 msg-enter">
                      <p className="text-sm text-[#312e29] leading-relaxed mb-5">
                        {exercise.description}
                      </p>

                      <div className="mb-5">
                        <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                          Steps
                        </p>
                        <ol className="space-y-2">
                          {exercise.steps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-sm text-[#312e29]">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-[#fce4dc] flex items-center justify-center text-[10px] font-semibold text-[#6d2e20] mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <p className="text-[11px] text-[#b1ada5] italic mb-5">
                        Source: {exercise.source}
                      </p>

                      <button
                        type="button"
                        onClick={() => startExercise(exercise)}
                        className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-4 py-3 text-white text-sm font-medium hover:shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Practice with AI coach
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          Exercises based on Gottman Method, Emotionally Focused Therapy, and Attachment Theory.
        </p>
      </footer>
    </div>
  );
}
