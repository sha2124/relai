"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Nudge {
  id: string;
  type: "follow_up" | "check_in" | "encouragement" | "exercise" | "reflection";
  title: string;
  content: string;
  context: string | null;
  action_type: "chat" | "journal" | "exercise" | "partner" | null;
  action_label: string | null;
  action_url: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<
  Nudge["type"],
  { emoji: string; label: string }
> = {
  follow_up: { emoji: "\u{1F504}", label: "Follow-up" },
  check_in: { emoji: "\u{1F4AD}", label: "Check-in" },
  encouragement: { emoji: "\u{1F31F}", label: "Encouragement" },
  exercise: { emoji: "\u{1F3CB}\uFE0F", label: "Exercise" },
  reflection: { emoji: "\u{1FA9E}", label: "Reflection" },
};

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

function groupNudges(nudges: Nudge[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const today: Nudge[] = [];
  const thisWeek: Nudge[] = [];
  const earlier: Nudge[] = [];

  for (const nudge of nudges) {
    const d = new Date(nudge.created_at);
    if (d >= todayStart) {
      today.push(nudge);
    } else if (d >= weekStart) {
      thisWeek.push(nudge);
    } else {
      earlier.push(nudge);
    }
  }

  return { today, thisWeek, earlier };
}

export default function NudgesPage() {
  const router = useRouter();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadNudges = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth?next=/nudges");
      return;
    }

    const { data } = await supabase
      .from("nudges")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false });

    if (data) {
      setNudges(data as Nudge[]);
    }

    return { user, nudges: data as Nudge[] | null };
  }, [router]);

  const generateNudges = useCallback(
    async (userId: string) => {
      setGenerating(true);
      setError(null);

      try {
        const supabase = createClient();

        // Fetch messages, journal, profile, and today's nudge types in parallel
        const [messagesRes, journalRes, profileRes, todayNudgesRes] =
          await Promise.all([
            supabase
              .from("messages")
              .select("role, content, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: true }),
            supabase
              .from("journal_entries")
              .select("content, mood, tags, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: true }),
            supabase
              .from("profiles")
              .select(
                "attachment_style, communication_style, conflict_response"
              )
              .eq("user_id", userId)
              .single(),
            supabase
              .from("nudges")
              .select("type")
              .eq("user_id", userId)
              .gte(
                "created_at",
                new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  new Date().getDate()
                ).toISOString()
              ),
          ]);

        const messages = messagesRes.data ?? [];
        const journalEntries = journalRes.data ?? [];
        const existingNudgeTypes = (todayNudgesRes.data ?? []).map(
          (n: { type: string }) => n.type
        );

        // Build archetype
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

        // Skip generation if no data at all
        if (messages.length === 0 && journalEntries.length === 0) {
          setGenerating(false);
          return;
        }

        const res = await fetch("/api/nudges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            journalEntries,
            archetype,
            existingNudgeTypes,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to generate nudges");
        }

        const data = await res.json();
        const generatedNudges = data.nudges ?? [];

        // Insert nudges into Supabase
        if (generatedNudges.length > 0) {
          const toInsert = generatedNudges.map(
            (n: {
              type: string;
              title: string;
              content: string;
              context: string;
              action_type: string | null;
              action_label: string | null;
              action_url: string | null;
            }) => ({
              user_id: userId,
              type: n.type,
              title: n.title,
              content: n.content,
              context: n.context,
              action_type: n.action_type,
              action_label: n.action_label,
              action_url: n.action_url,
            })
          );

          const { data: inserted } = await supabase
            .from("nudges")
            .insert(toInsert)
            .select();

          if (inserted) {
            setNudges((prev) => [...(inserted as Nudge[]), ...prev]);
          }
        }
      } catch (err) {
        console.error("[nudges] Generation error:", err);
        setError(
          "Couldn't generate nudges right now. Try refreshing in a bit."
        );
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  useEffect(() => {
    async function init() {
      const result = await loadNudges();
      setLoading(false);

      if (result?.user) {
        // Check if we have any nudges from today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const hasTodayNudges = (result.nudges ?? []).some(
          (n) => new Date(n.created_at) >= todayStart
        );

        if (!hasTodayNudges) {
          await generateNudges(result.user.id);
        }
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAsRead(nudgeId: string) {
    const nudge = nudges.find((n) => n.id === nudgeId);
    if (!nudge || nudge.is_read) return;

    // Optimistic update
    setNudges((prev) =>
      prev.map((n) => (n.id === nudgeId ? { ...n, is_read: true } : n))
    );

    await fetch("/api/nudges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nudgeId, action: "read" }),
    });
  }

  async function dismissNudge(nudgeId: string) {
    setDismissingIds((prev) => new Set(prev).add(nudgeId));

    // Wait for fade animation
    setTimeout(async () => {
      setNudges((prev) => prev.filter((n) => n.id !== nudgeId));
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(nudgeId);
        return next;
      });

      await fetch("/api/nudges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudgeId, action: "dismiss" }),
      });
    }, 300);
  }

  function handleAction(nudge: Nudge) {
    markAsRead(nudge.id);
    if (nudge.action_url) {
      router.push(nudge.action_url);
    }
  }

  const unreadCount = nudges.filter((n) => !n.is_read).length;
  const grouped = groupNudges(nudges);

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
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] tracking-tight">
              Your Nudges
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#8d4837] text-white text-xs font-semibold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            Little check-ins based on what you&apos;ve been sharing. Your coach
            is paying attention.
          </p>

          {/* Generating state */}
          {generating && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#7a766f]">
                  Thinking about what to share with you...
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-sm text-[#7a766f]">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!generating && nudges.length === 0 && (
            <div className="text-center py-16 animate-fade-up">
              <div className="relative mx-auto mb-5 w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-[#8d4837]/10 blur-xl scale-125" />
                <div className="relative h-20 w-20 rounded-full bg-[#8d4837]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-[#8d4837]">
                    notifications
                  </span>
                </div>
              </div>
              <h3 className="font-heading text-xl font-semibold text-[#312e29] mb-2">
                No nudges yet
              </h3>
              <p className="text-sm text-[#7a766f] max-w-xs mx-auto mb-6">
                Keep chatting and journaling, and I&apos;ll check in with you!
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

          {/* Nudge groups */}
          {nudges.length > 0 && (
            <div className="space-y-8">
              {grouped.today.length > 0 && (
                <NudgeGroup
                  label="Today"
                  nudges={grouped.today}
                  dismissingIds={dismissingIds}
                  onAction={handleAction}
                  onDismiss={dismissNudge}
                  onRead={markAsRead}
                />
              )}
              {grouped.thisWeek.length > 0 && (
                <NudgeGroup
                  label="This week"
                  nudges={grouped.thisWeek}
                  dismissingIds={dismissingIds}
                  onAction={handleAction}
                  onDismiss={dismissNudge}
                  onRead={markAsRead}
                />
              )}
              {grouped.earlier.length > 0 && (
                <NudgeGroup
                  label="Earlier"
                  nudges={grouped.earlier}
                  dismissingIds={dismissingIds}
                  onAction={handleAction}
                  onDismiss={dismissNudge}
                  onRead={markAsRead}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          Nudges are based on your conversations and journal entries.
        </p>
      </footer>

      <style jsx>{`
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }
      `}</style>
    </div>
  );
}

function NudgeGroup({
  label,
  nudges,
  dismissingIds,
  onAction,
  onDismiss,
  onRead,
}: {
  label: string;
  nudges: Nudge[];
  dismissingIds: Set<string>;
  onAction: (nudge: Nudge) => void;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
        {label}
      </p>
      <div className="space-y-3">
        {nudges.map((nudge) => {
          const config = TYPE_CONFIG[nudge.type];
          const isDismissing = dismissingIds.has(nudge.id);

          return (
            <div
              key={nudge.id}
              className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm transition-all duration-300"
              style={
                isDismissing
                  ? { animation: "fadeOut 0.3s ease-out forwards" }
                  : undefined
              }
              onMouseEnter={() => {
                if (!nudge.is_read) onRead(nudge.id);
              }}
            >
              <div className="flex items-start gap-3">
                {/* Type emoji */}
                <div className="w-10 h-10 rounded-full bg-[#8d4837]/[0.07] flex items-center justify-center shrink-0 text-lg">
                  {config.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Unread dot */}
                    {!nudge.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#8d4837] shrink-0" />
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#7a766f]">
                      {config.label}
                    </span>
                    <span className="text-[10px] text-[#b1ada5] ml-auto">
                      {relativeTime(nudge.created_at)}
                    </span>
                  </div>

                  <h3 className="font-heading font-semibold text-[#312e29] text-[15px] leading-snug mb-1">
                    {nudge.title}
                  </h3>

                  <p className="text-sm text-[#5c5650] leading-relaxed">
                    {nudge.content}
                  </p>

                  {/* Action button */}
                  {nudge.action_type && nudge.action_label && (
                    <button
                      type="button"
                      onClick={() => onAction(nudge)}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8d4837]/[0.08] text-[#8d4837] text-sm font-medium hover:bg-[#8d4837]/[0.15] transition-colors"
                    >
                      {nudge.action_type === "chat" && (
                        <span className="material-symbols-outlined text-base">
                          chat
                        </span>
                      )}
                      {nudge.action_type === "journal" && (
                        <span className="material-symbols-outlined text-base">
                          edit_note
                        </span>
                      )}
                      {nudge.action_type === "exercise" && (
                        <span className="material-symbols-outlined text-base">
                          fitness_center
                        </span>
                      )}
                      {nudge.action_type === "partner" && (
                        <span className="material-symbols-outlined text-base">
                          favorite
                        </span>
                      )}
                      {nudge.action_label}
                    </button>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={() => onDismiss(nudge.id)}
                  className="p-1.5 rounded-lg text-[#b1ada5] hover:text-[#7a766f] hover:bg-[#e2dcd1]/40 transition-all shrink-0"
                  title="Dismiss"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
