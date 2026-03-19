"use client";

import type { QuizQuestion } from "@/lib/quiz/questions";

interface QuizCardProps {
  question: QuizQuestion;
  selectedId?: string;
  onSelect: (optionId: string) => void;
}

export function QuizCard({ question, selectedId, onSelect }: QuizCardProps) {
  return (
    <div className="w-full max-w-lg msg-enter">
      {/* Question */}
      <h2 className="text-xl sm:text-2xl font-semibold text-[#1a1008] mb-2 leading-snug tracking-tight">
        {question.question}
      </h2>
      {question.subtitle && (
        <p className="text-sm text-[#8a7a66] mb-8 leading-relaxed">
          {question.subtitle}
        </p>
      )}
      {!question.subtitle && <div className="mb-8" />}

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`w-full text-left rounded-xl px-5 py-4 text-[15px] leading-relaxed transition-all duration-200 ${
                isSelected
                  ? "bg-[#2d4e43] text-white shadow-md scale-[1.01]"
                  : "bg-white/70 backdrop-blur-sm border border-[#e8e4df] text-[#2d2418] hover:bg-white hover:border-[#d4cfc7] hover:shadow-sm starter-prompt"
              }`}
            >
              {option.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
