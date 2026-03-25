"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface Change {
  original_phrase: string;
  new_phrase: string;
  reason: string;
  category: string;
}

interface TranslateResult {
  translated: string;
  changes: Change[];
}

const CATEGORY_LABELS: Record<string, string> = {
  blame: "Blame language",
  criticism: "Criticism",
  contempt: "Contempt",
  defensiveness: "Defensiveness",
  demand: "Demand",
  generalization: "Generalization",
  "mind-reading": "Mind-reading",
};

const CATEGORY_ICONS: Record<string, string> = {
  blame: "gavel",
  criticism: "edit_note",
  contempt: "sentiment_very_dissatisfied",
  defensiveness: "shield",
  demand: "front_hand",
  generalization: "all_inclusive",
  "mind-reading": "psychology",
};

function highlightPhrases(text: string, phrases: string[], className: string) {
  if (!phrases.length) return <span>{text}</span>;

  // Sort phrases by length (longest first) to avoid partial matches
  const sorted = [...phrases].sort((a, b) => b.length - a.length);

  // Escape regex special characters
  const escaped = sorted.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = sorted.some(
          (p) => p.toLowerCase() === part.toLowerCase()
        );
        return isMatch ? (
          <mark key={i} className={className}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

export default function TranslatePage() {
  const [original, setOriginal] = useState("");
  const [context, setContext] = useState<"sending" | "received">("sending");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const charCount = original.length;
  const maxChars = 2000;

  async function handleTranslate() {
    if (!original.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original: original.trim(), context }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const data: TranslateResult = await res.json();
      setResult(data);

      // Scroll to results after a brief delay for animation
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to translate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.translated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = result.translated;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handlePractice() {
    if (!result) return;
    localStorage.setItem(
      "relai-exercise-prompt",
      `I just used the Conflict Translator. Here's what I wanted to say:\n\n"${original.trim()}"\n\nThe translated version:\n\n"${result.translated}"\n\nCan you help me practice saying this in my own words?`
    );
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e2dcd1]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#8d4837]/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[#8d4837]" style={{ fontSize: 20 }}>
              arrow_back
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#8d4837]"
              style={{ fontSize: 22 }}
            >
              translate
            </span>
            <h1 className="font-heading text-lg font-semibold text-[#312e29]">
              Conflict Translator
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Intro */}
        <div className="text-center space-y-2 msg-enter">
          <p className="text-sm text-[#5e5b54] leading-relaxed">
            Paste a heated message and get it rewritten using Nonviolent Communication.
            <br />
            <span className="text-[#8d4837] font-medium">Same truth, less fire.</span>
          </p>
        </div>

        {/* Context Toggle */}
        <div className="msg-enter" style={{ animationDelay: "0.05s" }}>
          <div className="flex rounded-xl bg-white/60 border border-[#e2dcd1] p-1 gap-1">
            <button
              onClick={() => setContext("sending")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                context === "sending"
                  ? "bg-gradient-to-r from-[#8d4837] to-[#6d2e20] text-white shadow-sm"
                  : "text-[#5e5b54] hover:bg-white/80"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                send
              </span>
              I want to say this
            </button>
            <button
              onClick={() => setContext("received")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                context === "received"
                  ? "bg-gradient-to-r from-[#8d4837] to-[#6d2e20] text-white shadow-sm"
                  : "text-[#5e5b54] hover:bg-white/80"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                inbox
              </span>
              I received this
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="msg-enter" style={{ animationDelay: "0.1s" }}>
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837]">
                {context === "sending" ? "What you want to say" : "What you received"}
              </p>
            </div>
            <textarea
              value={original}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setOriginal(e.target.value);
                }
              }}
              placeholder={
                context === "sending"
                  ? 'e.g., "You never listen to me. Every time I try to talk to you, you just grab your phone..."'
                  : 'e.g., "I can\'t believe you forgot again. You obviously don\'t care about what matters to me..."'
              }
              className="w-full px-4 py-2 bg-transparent text-[#312e29] text-sm leading-relaxed placeholder:text-[#b1ada5] resize-none focus:outline-none min-h-[140px]"
              rows={6}
            />
            <div className="px-4 pb-3 flex justify-between items-center">
              <span className={`text-xs ${charCount > maxChars * 0.9 ? "text-[#b41340]" : "text-[#b1ada5]"}`}>
                {charCount}/{maxChars}
              </span>
              {original.trim() && (
                <button
                  onClick={() => {
                    setOriginal("");
                    setResult(null);
                    setError("");
                  }}
                  className="text-xs text-[#7a766f] hover:text-[#8d4837] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Translate Button */}
        <div className="msg-enter" style={{ animationDelay: "0.15s" }}>
          <button
            onClick={handleTranslate}
            disabled={!original.trim() || loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] text-white font-medium text-sm btn-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Translating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  auto_fix_high
                </span>
                Translate to NVC
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="msg-enter bg-[#b41340]/10 border border-[#b41340]/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="material-symbols-outlined text-[#b41340] mt-0.5" style={{ fontSize: 18 }}>
              error
            </span>
            <p className="text-sm text-[#b41340]">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div ref={resultRef} className="space-y-5">
            {/* Original with highlights */}
            <div className="msg-enter bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837]">
                Original
              </p>
              <p className="text-sm text-[#312e29] leading-relaxed">
                {highlightPhrases(
                  original,
                  result.changes.map((c) => c.original_phrase),
                  "bg-[#b41340]/12 text-[#b41340] rounded px-0.5 py-0.5"
                )}
              </p>
            </div>

            {/* Translated version */}
            <div className="msg-enter bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 space-y-3" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837]">
                  {context === "sending" ? "Try saying this instead" : "What they might mean"}
                </p>
                <div className="flex items-center gap-0.5 text-xs text-[#5e5b54] bg-[#e2dcd1]/40 rounded-full px-2 py-0.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    favorite
                  </span>
                  NVC
                </div>
              </div>
              <p className="text-sm text-[#312e29] leading-relaxed">
                {highlightPhrases(
                  result.translated,
                  result.changes.map((c) => c.new_phrase),
                  "bg-[#2e7d32]/10 text-[#2e7d32] rounded px-0.5 py-0.5"
                )}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#e2dcd1] text-sm font-medium text-[#5e5b54] hover:bg-white/80 hover:border-[#8d4837]/30 transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handlePractice}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    forum
                  </span>
                  Practice with coach
                </button>
              </div>
            </div>

            {/* Change explanation cards */}
            <div className="space-y-3 msg-enter" style={{ animationDelay: "0.2s" }}>
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837]">
                What changed & why
              </p>
              <div className="space-y-2.5">
                {result.changes.map((change, i) => (
                  <div
                    key={i}
                    className="msg-enter bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-xl overflow-hidden"
                    style={{ animationDelay: `${0.25 + i * 0.08}s` }}
                  >
                    <div className="flex">
                      {/* Color-coded left border */}
                      <div className="w-1 shrink-0 bg-gradient-to-b from-[#b41340]/60 to-[#2e7d32]/60" />

                      <div className="flex-1 p-3.5 space-y-2.5">
                        {/* Category badge */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className="material-symbols-outlined text-[#8d4837]"
                            style={{ fontSize: 16 }}
                          >
                            {CATEGORY_ICONS[change.category] || "info"}
                          </span>
                          <span className="text-xs font-semibold text-[#8d4837] uppercase tracking-wide">
                            {CATEGORY_LABELS[change.category] || change.category}
                          </span>
                        </div>

                        {/* Before / After */}
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-[#b41340]/12 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[#b41340]" style={{ fontSize: 12 }}>
                                remove
                              </span>
                            </span>
                            <p className="text-sm text-[#5e5b54] line-through decoration-[#b41340]/40">
                              &ldquo;{change.original_phrase}&rdquo;
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-[#2e7d32]/12 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[#2e7d32]" style={{ fontSize: 12 }}>
                                add
                              </span>
                            </span>
                            <p className="text-sm text-[#312e29] font-medium">
                              &ldquo;{change.new_phrase}&rdquo;
                            </p>
                          </div>
                        </div>

                        {/* Reason */}
                        <p className="text-xs text-[#7a766f] leading-relaxed pl-6">
                          {change.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Try another */}
            <div className="text-center pt-2 msg-enter" style={{ animationDelay: "0.4s" }}>
              <button
                onClick={() => {
                  setOriginal("");
                  setResult(null);
                  setError("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-sm text-[#8d4837] font-medium hover:underline underline-offset-2 transition-all"
              >
                Translate another message
              </button>
            </div>
          </div>
        )}

        {/* Empty state hint — only show when no result and not loading */}
        {!result && !loading && !original.trim() && (
          <div className="msg-enter space-y-4 pt-4" style={{ animationDelay: "0.2s" }}>
            <div className="bg-white/50 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 space-y-4">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837]">
                How it works
              </p>
              <div className="space-y-3">
                {[
                  {
                    icon: "edit",
                    title: "Paste the message",
                    desc: "The heated text you want to send, or just received.",
                  },
                  {
                    icon: "auto_fix_high",
                    title: "AI rewrites it",
                    desc: "Using Nonviolent Communication — same truth, less fire.",
                  },
                  {
                    icon: "visibility",
                    title: "See what changed",
                    desc: "Each change explained: blame removed, needs named, requests made clear.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#8d4837]/8 flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-[#8d4837]"
                        style={{ fontSize: 18 }}
                      >
                        {step.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#312e29]">{step.title}</p>
                      <p className="text-xs text-[#7a766f]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NVC explainer */}
            <div className="bg-white/40 backdrop-blur-sm border border-[#e2dcd1] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#705900]" style={{ fontSize: 16 }}>
                  school
                </span>
                <p className="text-xs font-semibold text-[#705900] uppercase tracking-wide">
                  What is NVC?
                </p>
              </div>
              <p className="text-xs text-[#5e5b54] leading-relaxed">
                Nonviolent Communication (Marshall Rosenberg) replaces blame with four steps:
                <span className="font-medium text-[#312e29]"> Observation</span> (what happened) →
                <span className="font-medium text-[#312e29]"> Feeling</span> (how I feel) →
                <span className="font-medium text-[#312e29]"> Need</span> (what I need) →
                <span className="font-medium text-[#312e29]"> Request</span> (what I&apos;d like).
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
