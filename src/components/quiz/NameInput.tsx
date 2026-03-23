"use client";

import { useState } from "react";

interface NameInputProps {
  question: string;
  subtitle?: string;
  onSubmit: (name: string) => void;
}

export function NameInput({ question, subtitle, onSubmit }: NameInputProps) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  }

  return (
    <div className="w-full max-w-lg msg-enter">
      <h2 className="text-xl sm:text-2xl font-semibold text-[#312e29] mb-2 leading-snug tracking-tight">
        {question}
      </h2>
      {subtitle && (
        <p className="text-sm text-[#7a766f] mb-8 leading-relaxed">
          {subtitle}
        </p>
      )}
      {!subtitle && <div className="mb-8" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          autoFocus
          className="w-full rounded-xl border border-[#e2dcd1] bg-white px-5 py-4 text-lg text-[#312e29] placeholder:text-[#b1ada5] focus:outline-none focus:ring-2 focus:ring-[#8d4837]/20 focus:border-[#8d4837]/40 transition-all shadow-sm"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          See my profile
        </button>
      </form>
    </div>
  );
}
