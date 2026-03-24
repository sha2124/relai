"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Insight {
  type: "theme" | "pattern" | "growth" | "blind_spot" | "horseman";
  title: string;
  description: string;
  evidence: string[];
  severity?: "low" | "medium" | "high";
  suggestion: string;
}

const CARD_CONFIG: Record<
  Insight["type"],
  { icon: string; color: string; borderColor: string; label: string }
> = {
  theme: {
    icon: "repeat",
    color: "text-[#8d4837]",
    borderColor: "border-l-[#8d4837]",
    label: "Recurring Theme",
  },
  pattern: {
    icon: "psychology",
    color: "text-[#81502b]",
    borderColor: "border-l-[#81502b]",
    label: "Emotional Pattern",
  },
  growth: {
    icon: "trending_up",
    color: "text-[#3a6355]",
    borderColor: "border-l-[#3a6355]",
    label: "Growth Moment",
  },
  blind_spot: {
    icon: "visibility_off",
    color: "text-[#7a766f]",
    borderColor: "border-l-[#7a766f]",
    label: "Blind Spot Alert",
  },
  horseman: {
    icon: "warning",
    color: "text-[#b41340]",
    borderColor: "border-l-[#b41340]",
    label: "Four Horsemen Watch",
  },
};

export default function InsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [archetype, setArchetype] = useState<string | undefined>(undefined);

  const fetchAndAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/insights");
        return;
      }

      // Fetch messages, journal entries, and profile in parallel
      const [messagesRes, journalRes, profileRes] = await Promise.all([
        supabase
          .from("messages")
          .select("role, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("journal_entries")
          .select("content, mood, tags, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("attachment_style, communication_style, conflict_response")
          .eq("user_id", user.id)
          .single(),
      ]);

      const messages = messagesRes.data ?? [];
      const journalEntries = journalRes.data ?? [];

      // Build archetype string if profile exists
      if (profileRes.data) {
        const p = profileRes.data;
        if (
          p.attachment_style?.primary &&
          p.communication_style?.primary &&
          p.conflict_response?.primary
        ) {
          setArchetype(
            `${p.attachment_style.primary} attachment, ${p.communication_style.primary} communicator, ${p.conflict_response.primary} conflict style`
          );
        }
      }

      if (messages.length === 0 && journalEntries.length === 0) {
        setIsEmpty(true);
        setLoading(false);
        setAnalyzing(false);
        return;
      }

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, journalEntries, archetype }),
      });

      if (!res.ok) {
        throw new Error("Analysis failed");
      }

      const data = await res.json();
      setInsights(data.insights ?? []);
      setAnalyzedAt(data.analyzedAt ?? new Date().toISOString());
      setIsEmpty(false);
    } catch (err) {
      console.error("[insights] Error:", err);
      setError("Something went wrong analyzing your patterns. Try again?");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, [router, archetype]);

  useEffect(() => {
    fetchAndAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDiscussWithCoach() {
    // Build a context summary to pass to chat
    const insightSummary = insights
      .map((i) => `${CARD_CONFIG[i.type].label}: ${i.title} — ${i.description}`)
      .join("\n");

    // Store in sessionStorage so the chat page can pick it up
    sessionStorage.setItem("insightContext", insightSummary);
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#fcf6ed]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#fcf6ed]/80 backdrop-blur-md border-b border-[#e2dcd1]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-full bg-white/70 border border-[#e2dcd1] flex items-center justify-center hover:bg-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-[#5c5650]">
              arrow_back
            </span>
          </button>
          <div className="flex-1">
            <h1 className="font-heading text-xl font-bold text-[#2c2825]">
              Your Patterns
            </h1>
            <p className="text-sm text-[#7a766f]">
              What your conversations reveal
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Analysis status bar */}
        {analyzedAt && !loading && (
          <div className="flex items-center justify-between text-sm text-[#7a766f]">
            <span>
              Last analyzed:{" "}
              {new Date(analyzedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={fetchAndAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-[#e2dcd1] text-[#5c5650] hover:bg-white transition-colors disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${analyzing ? "animate-spin" : ""}`}
              >
                refresh
              </span>
              {analyzing ? "Analyzing..." : "Refresh insights"}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#e2dcd1]/60" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-[#e2dcd1]/60 rounded w-1/3" />
                    <div className="h-3 bg-[#e2dcd1]/40 rounded w-2/3" />
                  </div>
                </div>
                <div className="h-3 bg-[#e2dcd1]/30 rounded w-full mb-2" />
                <div className="h-3 bg-[#e2dcd1]/30 rounded w-4/5" />
              </div>
            ))}
            <p className="text-center text-sm text-[#7a766f] pt-2">
              Analyzing your patterns...
            </p>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !loading && (
          <div className="text-center py-16 space-y-4">
            <span className="material-symbols-outlined text-[48px] text-[#d4cec4]">
              auto_awesome
            </span>
            <h2 className="font-heading text-lg font-semibold text-[#5c5650]">
              Insights are on the way
            </h2>
            <p className="text-sm text-[#7a766f] max-w-xs mx-auto leading-relaxed">
              Keep chatting with your coach and journaling — insights appear
              after a few sessions. The more you share, the smarter this gets.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-5 py-2.5 rounded-full bg-[#8d4837] text-white text-sm font-medium hover:bg-[#7a3d2f] transition-colors"
            >
              Start a conversation
            </button>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12 space-y-4">
            <span className="material-symbols-outlined text-[48px] text-[#b41340]/40">
              error_outline
            </span>
            <p className="text-sm text-[#7a766f]">{error}</p>
            <button
              onClick={fetchAndAnalyze}
              className="px-5 py-2.5 rounded-full bg-[#8d4837] text-white text-sm font-medium hover:bg-[#7a3d2f] transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Insight cards */}
        {!loading && !isEmpty && !error && insights.length > 0 && (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const config = CARD_CONFIG[insight.type];
              const isExpanded = expandedIndex === index;

              return (
                <div
                  key={index}
                  className={`bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl overflow-hidden border-l-4 ${config.borderColor} transition-all duration-300`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: "fadeSlideUp 0.4s ease-out both",
                  }}
                >
                  <button
                    onClick={() =>
                      setExpandedIndex(isExpanded ? null : index)
                    }
                    className="w-full text-left p-5 focus:outline-none"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          insight.type === "growth"
                            ? "bg-[#3a6355]/10"
                            : insight.type === "horseman"
                              ? "bg-[#b41340]/10"
                              : insight.type === "blind_spot"
                                ? "bg-[#7a766f]/10"
                                : insight.type === "pattern"
                                  ? "bg-[#81502b]/10"
                                  : "bg-[#8d4837]/10"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${config.color}`}
                        >
                          {config.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium uppercase tracking-wide text-[#7a766f]">
                            {config.label}
                          </span>
                          {insight.severity === "high" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#b41340]/10 text-[#b41340] font-medium">
                              Important
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading font-semibold text-[#2c2825] text-[15px] leading-snug">
                          {insight.title}
                        </h3>
                        {!isExpanded && (
                          <p className="text-sm text-[#5c5650] mt-1 line-clamp-2">
                            {insight.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`material-symbols-outlined text-[18px] text-[#b8b3ab] transition-transform duration-200 mt-1 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 animate-[fadeIn_0.2s_ease-out]">
                      <p className="text-sm text-[#5c5650] leading-relaxed">
                        {insight.description}
                      </p>

                      {/* Evidence quotes */}
                      {insight.evidence && insight.evidence.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-[#7a766f]">
                            From your words
                          </p>
                          {insight.evidence.map((quote, qi) => (
                            <div
                              key={qi}
                              className="border-l-2 border-[#d4cec4] pl-3 py-1"
                            >
                              <p className="text-[13px] text-[#5c5650] italic leading-relaxed">
                                &ldquo;{quote}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggestion */}
                      {insight.suggestion && (
                        <div className="bg-[#fcf6ed] rounded-xl p-3.5">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[16px] text-[#705900] mt-0.5">
                              lightbulb
                            </span>
                            <p className="text-sm text-[#5c5650] leading-relaxed">
                              {insight.suggestion}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Discuss with coach button */}
        {!loading && !isEmpty && insights.length > 0 && (
          <div className="pt-4 pb-8">
            <button
              onClick={handleDiscussWithCoach}
              className="w-full py-3.5 rounded-2xl bg-[#8d4837] text-white font-medium text-sm hover:bg-[#7a3d2f] transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                chat
              </span>
              Discuss with your coach
            </button>
          </div>
        )}
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
