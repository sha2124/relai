"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Commitment {
  id: string;
  user_id: string;
  commitment_text: string;
  context: string | null;
  detected_at: string;
  follow_up_at: string;
  status: "pending" | "followed_up" | "completed" | "skipped";
  outcome: string | null;
  created_at: string;
}

interface DetectedCommitment {
  text: string;
  context: string;
  urgency: string;
  suggested_follow_up: string;
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeUntil(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Less than an hour";
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}

export default function CheckInsPage() {
  const router = useRouter();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeOutcomeId, setActiveOutcomeId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState("");
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const [pendingDetected, setPendingDetected] = useState<DetectedCommitment[]>(
    []
  );

  const loadCommitments = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth?next=/check-ins");
      return null;
    }

    setUserId(user.id);

    const { data } = await supabase
      .from("commitments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setCommitments(data as Commitment[]);
    }

    return user;
  }, [router]);

  const scanForCommitments = useCallback(async () => {
    if (!userId) return;
    setScanning(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch recent messages
      const { data: messages } = await supabase
        .from("messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!messages || messages.length === 0) {
        setScanning(false);
        return;
      }

      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        throw new Error("Failed to scan");
      }

      const data = await res.json();
      const detected: DetectedCommitment[] = data.commitments ?? [];

      if (detected.length > 0) {
        // Filter out already-tracked commitments (fuzzy match on text)
        const existingTexts = commitments.map((c) =>
          c.commitment_text.toLowerCase()
        );
        const newDetected = detected.filter(
          (d) =>
            !existingTexts.some(
              (et) =>
                et.includes(d.text.toLowerCase().slice(0, 30)) ||
                d.text.toLowerCase().includes(et.slice(0, 30))
            )
        );

        if (newDetected.length > 0) {
          setPendingDetected(newDetected);
        }
      }

      // Store last scan time
      localStorage.setItem("relai-last-commitment-scan", new Date().toISOString());
    } catch (err) {
      console.error("[check-ins] Scan error:", err);
      setError("Couldn't scan conversations right now. Try again in a bit.");
    } finally {
      setScanning(false);
    }
  }, [userId, commitments]);

  const confirmCommitment = async (detected: DetectedCommitment) => {
    if (!userId) return;

    const supabase = createClient();
    const followUpAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000
    ).toISOString();

    const { data: inserted } = await supabase
      .from("commitments")
      .insert({
        user_id: userId,
        commitment_text: detected.text,
        context: detected.context,
        follow_up_at: followUpAt,
      })
      .select()
      .single();

    if (inserted) {
      setCommitments((prev) => [inserted as Commitment, ...prev]);
    }

    setPendingDetected((prev) => prev.filter((d) => d.text !== detected.text));
  };

  const dismissDetected = (detected: DetectedCommitment) => {
    setPendingDetected((prev) => prev.filter((d) => d.text !== detected.text));
  };

  const updateCommitment = async (
    id: string,
    status: string,
    outcome?: string
  ) => {
    // Optimistic update
    setCommitments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: status as Commitment["status"], outcome: outcome ?? c.outcome }
          : c
      )
    );

    await fetch("/api/check-in", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commitmentId: id, status, outcome }),
    });
  };

  const handleCompleted = async (id: string) => {
    setActiveOutcomeId(id);
  };

  const submitOutcome = async (id: string) => {
    await updateCommitment(id, "completed", outcomeText || undefined);
    setActiveOutcomeId(null);
    setOutcomeText("");
    setCelebrateId(id);
    setTimeout(() => setCelebrateId(null), 3000);

    // Create a nudge for this completion
    if (userId) {
      const commitment = commitments.find((c) => c.id === id);
      if (commitment) {
        const supabase = createClient();
        await supabase.from("nudges").insert({
          user_id: userId,
          type: "encouragement",
          title: "You followed through!",
          content: `You committed to "${commitment.commitment_text}" and you did it. That's real growth.`,
          context: "commitment_completed",
          action_type: null,
          action_label: null,
          action_url: null,
        });
      }
    }
  };

  const handleNotYet = async (id: string) => {
    // Reset to pending with extended follow_up_at
    await updateCommitment(id, "pending");
    // Refresh to get updated follow_up_at
    const supabase = createClient();
    const { data } = await supabase
      .from("commitments")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      setCommitments((prev) =>
        prev.map((c) => (c.id === id ? (data as Commitment) : c))
      );
    }
  };

  const handleSkip = async (id: string) => {
    await updateCommitment(id, "skipped");
  };

  // Create nudges for due commitments
  const createFollowUpNudges = useCallback(
    async (dueCommitments: Commitment[]) => {
      if (!userId || dueCommitments.length === 0) return;

      const supabase = createClient();

      // Check existing nudges to avoid duplicates
      const { data: existingNudges } = await supabase
        .from("nudges")
        .select("content")
        .eq("user_id", userId)
        .eq("type", "follow_up")
        .eq("is_dismissed", false);

      const existingContents = (existingNudges ?? []).map(
        (n: { content: string }) => n.content
      );

      for (const commitment of dueCommitments) {
        const nudgeContent = `How did it go with "${commitment.commitment_text}"? Check in and let me know.`;

        if (!existingContents.some((c: string) => c.includes(commitment.commitment_text.slice(0, 40)))) {
          await supabase.from("nudges").insert({
            user_id: userId,
            type: "follow_up",
            title: "How did it go?",
            content: nudgeContent,
            context: `commitment_follow_up:${commitment.id}`,
            action_type: "chat",
            action_label: "Check in",
            action_url: "/check-ins",
          });
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    async function init() {
      const user = await loadCommitments();
      setLoading(false);

      if (user) {
        // Check if we should auto-scan
        const lastScan = localStorage.getItem("relai-last-commitment-scan");
        const shouldScan =
          !lastScan ||
          Date.now() - new Date(lastScan).getTime() > 24 * 60 * 60 * 1000;

        if (shouldScan) {
          // Delay scan slightly to avoid blocking UI
          setTimeout(() => scanForCommitments(), 500);
        }
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create follow-up nudges for due commitments
  useEffect(() => {
    const now = new Date();
    const dueCommitments = commitments.filter(
      (c) => c.status === "pending" && new Date(c.follow_up_at) <= now
    );
    if (dueCommitments.length > 0) {
      createFollowUpNudges(dueCommitments);
    }
  }, [commitments, createFollowUpNudges]);

  // Categorize commitments
  const now = new Date();
  const activeCommitments = commitments.filter(
    (c) => c.status === "pending" && new Date(c.follow_up_at) <= now
  );
  const upcomingCommitments = commitments.filter(
    (c) => c.status === "pending" && new Date(c.follow_up_at) > now
  );
  const completedCommitments = commitments.filter(
    (c) => c.status === "completed"
  );
  const skippedCommitments = commitments.filter(
    (c) => c.status === "skipped"
  );

  const totalTracked = completedCommitments.length + skippedCommitments.length + activeCommitments.length;
  const completionRate =
    totalTracked > 0
      ? Math.round((completedCommitments.length / totalTracked) * 100)
      : 0;

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
          {/* Back button */}
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

          {/* Header */}
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
            Your Commitments
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            Things you said you&apos;d try. Let&apos;s see how they went.
          </p>

          {/* Completion rate */}
          {totalTracked > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837]">
                  Follow-through rate
                </p>
                <p className="text-2xl font-semibold text-[#312e29]">
                  {completionRate}%
                </p>
              </div>
              <div className="h-3 bg-[#ede7dd] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8d4837] to-[#c47a6b] rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="text-xs text-[#7a766f] mt-2">
                You&apos;ve followed through on {completedCommitments.length} of{" "}
                {totalTracked} commitments
              </p>
            </div>
          )}

          {/* Scan button */}
          <button
            type="button"
            onClick={scanForCommitments}
            disabled={scanning}
            className="w-full mb-6 rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-6 py-3.5 text-white text-sm font-medium hover:shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Looking for commitments you&apos;ve made...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  search
                </span>
                Scan recent conversations
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-sm text-[#7a766f]">{error}</p>
            </div>
          )}

          {/* Pending detected commitments (confirm/dismiss) */}
          {pendingDetected.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                New commitments detected
              </p>
              <div className="space-y-3">
                {pendingDetected.map((d) => (
                  <div
                    key={d.text}
                    className="bg-white/70 backdrop-blur-sm border border-[#8d4837]/20 rounded-2xl p-5 shadow-sm"
                  >
                    <p className="font-heading font-semibold text-[#312e29] text-[15px] leading-snug mb-1">
                      {d.text}
                    </p>
                    <p className="text-sm text-[#7a766f] leading-relaxed mb-4">
                      {d.context}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => confirmCommitment(d)}
                        className="flex-1 rounded-xl bg-[#8d4837]/[0.08] text-[#8d4837] text-sm font-medium py-2.5 hover:bg-[#8d4837]/[0.15] transition-colors"
                      >
                        Track this
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissDetected(d)}
                        className="flex-1 rounded-xl bg-[#ede7dd]/60 text-[#7a766f] text-sm font-medium py-2.5 hover:bg-[#ede7dd] transition-colors"
                      >
                        Not really
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active commitments (due for check-in) */}
          {activeCommitments.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                How did it go?
              </p>
              <div className="space-y-3">
                {activeCommitments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm"
                  >
                    {celebrateId === c.id ? (
                      <div className="text-center py-4 animate-fade-up">
                        <p className="text-3xl mb-2">&#127793;</p>
                        <p className="font-heading font-semibold text-[#312e29] text-lg">
                          That&apos;s huge!
                        </p>
                        <p className="text-sm text-[#7a766f]">
                          Growth in action. You said you&apos;d try it — and you
                          did.
                        </p>
                      </div>
                    ) : activeOutcomeId === c.id ? (
                      <div>
                        <p className="font-heading font-semibold text-[#312e29] text-[15px] leading-snug mb-3">
                          How did it go?
                        </p>
                        <textarea
                          value={outcomeText}
                          onChange={(e) => setOutcomeText(e.target.value)}
                          placeholder="Tell me what happened... (optional)"
                          className="w-full rounded-xl border border-[#e2dcd1] bg-white/80 px-4 py-3 text-sm text-[#312e29] placeholder:text-[#b1ada5] focus:outline-none focus:border-[#8d4837] transition-colors resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => submitOutcome(c.id)}
                            className="flex-1 rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] text-white text-sm font-medium py-2.5 hover:shadow-md transition-all"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveOutcomeId(null);
                              setOutcomeText("");
                            }}
                            className="rounded-xl bg-[#ede7dd]/60 text-[#7a766f] text-sm font-medium px-4 py-2.5 hover:bg-[#ede7dd] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-[#8d4837]/[0.07] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl text-[#8d4837]">
                              task_alt
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-semibold text-[#312e29] text-[15px] leading-snug">
                              {c.commitment_text}
                            </p>
                            {c.context && (
                              <p className="text-sm text-[#7a766f] leading-relaxed mt-1">
                                {c.context}
                              </p>
                            )}
                            <p className="text-[11px] text-[#b1ada5] mt-1.5">
                              Committed {relativeTime(c.detected_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => handleCompleted(c.id)}
                            className="flex-1 rounded-xl bg-[#8d4837]/[0.08] text-[#8d4837] text-sm font-medium py-2.5 hover:bg-[#8d4837]/[0.15] transition-colors"
                          >
                            I did it!
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNotYet(c.id)}
                            className="flex-1 rounded-xl bg-[#ede7dd]/60 text-[#7a766f] text-sm font-medium py-2.5 hover:bg-[#ede7dd] transition-colors"
                          >
                            Not yet
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSkip(c.id)}
                            className="rounded-xl bg-[#ede7dd]/60 text-[#b1ada5] text-sm font-medium px-3 py-2.5 hover:bg-[#ede7dd] hover:text-[#7a766f] transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming commitments */}
          {upcomingCommitments.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                Coming up
              </p>
              <div className="space-y-3">
                {upcomingCommitments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white/50 backdrop-blur-sm border border-[#e2dcd1]/60 rounded-2xl p-5 shadow-sm opacity-70"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e2dcd1]/40 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl text-[#b1ada5]">
                          schedule
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold text-[#312e29] text-[15px] leading-snug">
                          {c.commitment_text}
                        </p>
                        <p className="text-[11px] text-[#b1ada5] mt-1.5">
                          Check-in in {timeUntil(c.follow_up_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed commitments (collapsed) */}
          {completedCommitments.length > 0 && (
            <div className="mb-8">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4 w-full"
              >
                <span>
                  Completed ({completedCommitments.length})
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${showCompleted ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showCompleted && (
                <div className="space-y-3">
                  {completedCommitments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white/50 backdrop-blur-sm border border-[#e2dcd1]/60 rounded-2xl p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#68b89e]/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-xl text-[#68b89e]">
                            check_circle
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-semibold text-[#312e29] text-[15px] leading-snug">
                            {c.commitment_text}
                          </p>
                          {c.outcome && (
                            <p className="text-sm text-[#7a766f] leading-relaxed mt-1 italic">
                              &ldquo;{c.outcome}&rdquo;
                            </p>
                          )}
                          <p className="text-[11px] text-[#b1ada5] mt-1.5">
                            Completed {relativeTime(c.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {commitments.length === 0 &&
            pendingDetected.length === 0 &&
            !scanning && (
              <div className="text-center py-16 animate-fade-up">
                <div className="relative mx-auto mb-5 w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-[#8d4837]/10 blur-xl scale-125" />
                  <div className="relative h-20 w-20 rounded-full bg-[#8d4837]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#8d4837]">
                      task_alt
                    </span>
                  </div>
                </div>
                <h3 className="font-heading text-xl font-semibold text-[#312e29] mb-2">
                  No commitments detected yet
                </h3>
                <p className="text-sm text-[#7a766f] max-w-xs mx-auto mb-6">
                  Keep chatting with your coach — when you decide to try
                  something new, I&apos;ll track it here.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-6 py-3 text-white text-sm font-medium hover:shadow-md transition-all"
                >
                  Start a conversation
                </button>
              </div>
            )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          Commitments are detected from your coaching conversations.
        </p>
      </footer>
    </div>
  );
}
