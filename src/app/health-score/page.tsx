"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Dimensions {
  communication: number;
  emotional_safety: number;
  conflict_resolution: number;
  intimacy: number;
  growth: number;
}

interface HealthScore {
  overall_score: number;
  dimensions: Dimensions;
  insights: string;
  tips: string[];
  week_start: string;
  created_at: string;
}

const DIMENSION_META: {
  key: keyof Dimensions;
  label: string;
  emoji: string;
}[] = [
  { key: "communication", label: "Communication", emoji: "\uD83D\uDCE2" },
  { key: "emotional_safety", label: "Emotional Safety", emoji: "\uD83D\uDEE1\uFE0F" },
  { key: "conflict_resolution", label: "Conflict Resolution", emoji: "\uD83D\uDD27" },
  { key: "intimacy", label: "Intimacy & Connection", emoji: "\uD83D\uDC9B" },
  { key: "growth", label: "Growth & Effort", emoji: "\uD83C\uDF31" },
];

function getScoreColor(score: number): string {
  if (score <= 30) return "#b41340";
  if (score <= 50) return "#81502b";
  if (score <= 70) return "#705900";
  return "#4a7c59";
}

function getScoreLabel(score: number): string {
  if (score <= 30) return "Needs Attention";
  if (score <= 50) return "Building";
  if (score <= 70) return "Growing";
  return "Thriving";
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function ScoreGauge({
  score,
  animated,
}: {
  score: number;
  animated: boolean;
}) {
  const radius = 80;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = animated ? (score / 100) * circumference : 0;
  const color = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#e2dcd1"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            transition: "stroke-dashoffset 1.2s ease-out, stroke 0.3s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-heading text-5xl font-bold"
          style={{ color }}
        >
          {animated ? score : 0}
        </span>
        <span className="text-sm font-medium" style={{ color }}>
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

function DimensionBar({
  label,
  emoji,
  score,
  animated,
  delay,
}: {
  label: string;
  emoji: string;
  score: number;
  animated: boolean;
  delay: number;
}) {
  const color = getScoreColor(score);

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg w-7 text-center shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[#312e29] truncate">
            {label}
          </span>
          <span
            className="text-sm font-semibold tabular-nums ml-2"
            style={{ color }}
          >
            {animated ? score : 0}
          </span>
        </div>
        <div className="h-2.5 bg-[#ede7dd] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: animated ? `${score}%` : "0%",
              backgroundColor: color,
              transition: `width 1s ease-out ${delay}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TrendLine({ history }: { history: HealthScore[] }) {
  if (history.length < 2) return null;

  const scores = history.map((h) => h.overall_score);
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;

  const width = 280;
  const height = 60;
  const padding = 8;

  const points = scores.map((s, i) => {
    const x =
      padding +
      (i / (scores.length - 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((s - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polylinePoints = points.join(" ");
  const latestScore = scores[scores.length - 1];
  const previousScore = scores[scores.length - 2];
  const diff = latestScore - previousScore;

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
        Score trend
      </p>
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[280px]"
          style={{ height: "60px" }}
        >
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#8d4837"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, i) => {
            const [x, y] = point.split(",");
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i === points.length - 1 ? 4 : 3}
                fill={
                  i === points.length - 1 ? "#8d4837" : "#fce4dc"
                }
                stroke="#8d4837"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-[#7a766f]">
          {history.length} week{history.length !== 1 ? "s" : ""} tracked
        </span>
        {diff !== 0 && (
          <span
            className="text-sm font-medium"
            style={{
              color: diff > 0 ? "#4a7c59" : "#b41340",
            }}
          >
            {diff > 0 ? "\u2191" : "\u2193"} {Math.abs(diff)} pts from last
            week
          </span>
        )}
      </div>
    </div>
  );
}

export default function HealthScorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentScore, setCurrentScore] = useState<HealthScore | null>(null);
  const [history, setHistory] = useState<HealthScore[]>([]);
  const [animated, setAnimated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsGeneration, setNeedsGeneration] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/health-score");
        return;
      }

      const weekStart = getWeekStart();

      // Check for current week's score
      const { data: currentData } = await supabase
        .from("health_scores")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .single();

      // Get history (up to 8 weeks)
      const { data: historyData } = await supabase
        .from("health_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: true })
        .limit(8);

      if (currentData) {
        setCurrentScore({
          overall_score: currentData.overall_score,
          dimensions: currentData.dimensions as Dimensions,
          insights: currentData.insights,
          tips: (currentData.tips as string[]) ?? [],
          week_start: currentData.week_start,
          created_at: currentData.created_at,
        });
        setHistory(
          (historyData ?? []).map((h) => ({
            overall_score: h.overall_score,
            dimensions: h.dimensions as Dimensions,
            insights: h.insights,
            tips: (h.tips as string[]) ?? [],
            week_start: h.week_start,
            created_at: h.created_at,
          }))
        );
        // Trigger animation after mount
        setTimeout(() => setAnimated(true), 100);
      } else {
        setNeedsGeneration(true);
        setHistory(
          (historyData ?? []).map((h) => ({
            overall_score: h.overall_score,
            dimensions: h.dimensions as Dimensions,
            insights: h.insights,
            tips: (h.tips as string[]) ?? [],
            week_start: h.week_start,
            created_at: h.created_at,
          }))
        );
      }

      setLoading(false);
    }

    load();
  }, [router]);

  const generateScore = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/health-score");
        return;
      }

      // Fetch recent data
      const weekStart = getWeekStart();
      const [messagesRes, journalRes, profileRes, partnerRes] =
        await Promise.all([
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
            .select(
              "attachment_style, communication_style, conflict_response"
            )
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("partner_links")
            .select("status")
            .eq("user_id", user.id)
            .eq("status", "linked")
            .limit(1),
        ]);

      const messages = messagesRes.data ?? [];
      const journalEntries = journalRes.data ?? [];

      if (messages.length === 0 && journalEntries.length === 0) {
        setError(
          "Start chatting with your coach or journaling first — we need some data to analyze."
        );
        setGenerating(false);
        return;
      }

      // Build archetype string
      let archetype: string | undefined;
      if (profileRes.data) {
        const p = profileRes.data;
        if (
          p.attachment_style?.primary &&
          p.communication_style?.primary &&
          p.conflict_response?.primary
        ) {
          archetype = `${p.attachment_style.primary} attachment, ${p.communication_style.primary} communicator, ${p.conflict_response.primary} conflict style`;
        }
      }

      const partnerLinked =
        (partnerRes.data ?? []).length > 0;

      // Call API
      const res = await fetch("/api/health-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          journalEntries,
          archetype,
          partnerLinked,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate score");
      }

      const data = await res.json();

      // Save to Supabase
      const { error: insertError } = await supabase
        .from("health_scores")
        .insert({
          user_id: user.id,
          overall_score: data.overall_score,
          dimensions: data.dimensions,
          insights: data.insights,
          tips: data.tips,
          week_start: weekStart,
        });

      if (insertError) {
        console.error("[health-score] Insert error:", insertError);
      }

      const newScore: HealthScore = {
        overall_score: data.overall_score,
        dimensions: data.dimensions,
        insights: data.insights,
        tips: data.tips ?? [],
        week_start: weekStart,
        created_at: new Date().toISOString(),
      };

      setCurrentScore(newScore);
      setNeedsGeneration(false);

      // Update history
      setHistory((prev) => [...prev, newScore]);

      // Animate after a short delay
      setTimeout(() => setAnimated(true), 100);
    } catch (err) {
      console.error("[health-score] Error:", err);
      setError(
        "Something went wrong generating your score. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to chat
          </button>

          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
            Relationship Health
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            A weekly snapshot of your relationship patterns, powered by AI.
          </p>

          {/* Generate button (no score yet) */}
          {needsGeneration && !generating && !currentScore && (
            <div className="text-center py-12 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/70 border border-[#e2dcd1] flex items-center justify-center">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8d4837"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
                  No score yet this week
                </h2>
                <p className="text-sm text-[#7a766f] max-w-xs mx-auto leading-relaxed">
                  Generate your relationship health score based on your
                  conversations and journal entries.
                </p>
              </div>
              {error && (
                <p className="text-sm text-[#b41340]">{error}</p>
              )}
              <button
                type="button"
                onClick={generateScore}
                className="px-6 py-3 rounded-2xl bg-[#8d4837] text-white font-medium text-sm hover:bg-[#7a3d2f] transition-colors"
              >
                Generate your score
              </button>

              {/* Show history even if no current score */}
              {history.length > 1 && (
                <div className="mt-8">
                  <TrendLine history={history} />
                </div>
              )}
            </div>
          )}

          {/* Generating state */}
          {generating && (
            <div className="text-center py-16 space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-[#312e29] mb-1">
                  Analyzing your relationship patterns...
                </p>
                <p className="text-sm text-[#7a766f]">
                  Reviewing conversations, journal entries, and growth
                  signals
                </p>
              </div>
            </div>
          )}

          {/* Score display */}
          {currentScore && !generating && (
            <div className="space-y-6">
              {/* Score Gauge */}
              <div className="flex flex-col items-center">
                <ScoreGauge
                  score={currentScore.overall_score}
                  animated={animated}
                />
                <p className="text-xs text-[#7a766f] mt-3">
                  Based on your conversations and journal this week
                </p>
              </div>

              {/* Dimensions */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                  Dimension breakdown
                </p>
                <div className="space-y-4">
                  {DIMENSION_META.map((dim, i) => (
                    <DimensionBar
                      key={dim.key}
                      label={dim.label}
                      emoji={dim.emoji}
                      score={currentScore.dimensions[dim.key]}
                      animated={animated}
                      delay={i * 150}
                    />
                  ))}
                </div>
              </div>

              {/* Insights */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                  This week&apos;s insight
                </p>
                <p className="text-sm text-[#312e29] leading-relaxed">
                  {currentScore.insights}
                </p>
              </div>

              {/* Tips */}
              {currentScore.tips.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837]">
                    Try this week
                  </p>
                  {currentScore.tips.map((tip, i) => (
                    <div
                      key={i}
                      className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm flex items-start gap-3"
                    >
                      <span className="text-[#705900] text-lg shrink-0 mt-0.5">
                        {i === 0 ? "\u2728" : "\uD83D\uDCA1"}
                      </span>
                      <p className="text-sm text-[#312e29] leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* History trend */}
              {history.length > 1 && <TrendLine history={history} />}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm text-left hover:bg-white hover:shadow-md transition-all"
                >
                  <span className="text-xl mb-2 block">
                    {"\uD83D\uDCAC"}
                  </span>
                  <p className="text-sm font-semibold text-[#312e29]">
                    Practice with coach
                  </p>
                  <p className="text-xs text-[#7a766f]">
                    Work on a dimension
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/journal")}
                  className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm text-left hover:bg-white hover:shadow-md transition-all"
                >
                  <span className="text-xl mb-2 block">
                    {"\uD83D\uDCD3"}
                  </span>
                  <p className="text-sm font-semibold text-[#312e29]">
                    Journal about this
                  </p>
                  <p className="text-xs text-[#7a766f]">
                    Reflect on your score
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Error state (when not in needs-generation mode) */}
          {error && !needsGeneration && (
            <div className="text-center py-12 space-y-4">
              <p className="text-sm text-[#b41340]">{error}</p>
              <button
                type="button"
                onClick={generateScore}
                className="px-5 py-2.5 rounded-full bg-[#8d4837] text-white text-sm font-medium hover:bg-[#7a3d2f] transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          Scores reflect patterns in your app activity, not a clinical
          assessment.
        </p>
      </footer>
    </div>
  );
}
