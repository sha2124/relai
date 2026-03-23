"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";

interface Stats {
  totalMessages: number;
  totalJournalEntries: number;
  totalDays: number;
  weeklyMessages: number[];
  moodCounts: Record<string, number>;
  topTags: { tag: string; count: number }[];
  streakDays: number;
}

const MOOD_EMOJI: Record<string, string> = {
  great: "😊",
  good: "🙂",
  okay: "😐",
  tough: "😔",
  hard: "😢",
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/dashboard");
        return;
      }

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, attachment_style, communication_style, conflict_response")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name ?? "");
        if (profile.attachment_style?.primary && profile.communication_style?.primary && profile.conflict_response?.primary) {
          setArchetype(
            getArchetype(
              profile.attachment_style.primary,
              profile.communication_style.primary,
              profile.conflict_response.primary
            )
          );
        }
      }

      // Load messages
      const { data: messages } = await supabase
        .from("messages")
        .select("created_at, role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      // Load journal entries
      const { data: journalEntries } = await supabase
        .from("journal_entries")
        .select("created_at, mood, tags")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      // Compute stats
      const allMessages = messages ?? [];
      const allJournal = journalEntries ?? [];

      // Weekly messages (last 7 weeks)
      const weeklyMessages: number[] = [];
      const now = new Date();
      for (let w = 6; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - w * 7);
        const count = allMessages.filter((m) => {
          const d = new Date(m.created_at);
          return d >= weekStart && d < weekEnd && m.role === "user";
        }).length;
        weeklyMessages.push(count);
      }

      // Mood counts
      const moodCounts: Record<string, number> = {};
      allJournal.forEach((j) => {
        if (j.mood) {
          moodCounts[j.mood] = (moodCounts[j.mood] ?? 0) + 1;
        }
      });

      // Top tags
      const tagMap: Record<string, number> = {};
      allJournal.forEach((j) => {
        const tags = j.tags as string[] | null;
        if (tags) {
          tags.forEach((t: string) => {
            tagMap[t] = (tagMap[t] ?? 0) + 1;
          });
        }
      });
      const topTags = Object.entries(tagMap)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Active days count
      const activeDays = new Set<string>();
      allMessages.forEach((m) => activeDays.add(new Date(m.created_at).toDateString()));
      allJournal.forEach((j) => activeDays.add(new Date(j.created_at).toDateString()));

      // Streak calculation
      let streakDays = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let d = 0; d < 365; d++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - d);
        if (activeDays.has(checkDate.toDateString())) {
          streakDays++;
        } else if (d > 0) {
          break;
        }
      }

      setStats({
        totalMessages: allMessages.filter((m) => m.role === "user").length,
        totalJournalEntries: allJournal.length,
        totalDays: activeDays.size,
        weeklyMessages,
        moodCounts,
        topTags,
        streakDays,
      });

      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxWeekly = Math.max(...(stats?.weeklyMessages ?? [1]), 1);

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
            Your Progress
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            {userName ? `${userName}, here's` : "Here's"} how your relationship growth is going.
          </p>

          {/* ── Archetype Reminder ── */}
          {archetype && (
            <div
              className="rounded-2xl p-5 shadow-sm mb-6"
              style={{
                background: `linear-gradient(135deg, ${archetype.color}08, ${archetype.color}15)`,
                border: `1px solid ${archetype.color}20`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="shrink-0 h-14 w-14 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${archetype.color}20, ${archetype.color}40)`,
                    border: `2px solid ${archetype.color}30`,
                  }}
                >
                  <span className="text-2xl">{archetype.emoji}</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mb-0.5">Your archetype</p>
                  <p className="font-heading text-lg font-semibold text-[#312e29]">{archetype.name}</p>
                  <p className="text-xs text-[#7a766f] italic">{archetype.tagline}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-semibold text-[#312e29]">{stats?.streakDays ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mt-1">Day streak</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-semibold text-[#312e29]">{stats?.totalMessages ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mt-1">Messages</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-semibold text-[#312e29]">{stats?.totalJournalEntries ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mt-1">Journal</p>
            </div>
          </div>

          {/* ── Weekly Activity Chart ── */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
            <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
              Weekly activity
            </p>
            <div className="flex items-end gap-2 h-24">
              {stats?.weeklyMessages.map((count, i) => {
                const height = maxWeekly > 0 ? Math.max((count / maxWeekly) * 100, 4) : 4;
                const isCurrentWeek = i === (stats?.weeklyMessages.length ?? 0) - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-lg transition-all"
                      style={{
                        height: `${height}%`,
                        background: isCurrentWeek
                          ? "linear-gradient(180deg, #8d4837, #6d2e20)"
                          : "#fce4dc",
                      }}
                    />
                    <span className="text-[9px] text-[#b1ada5]">
                      {i === (stats?.weeklyMessages.length ?? 0) - 1 ? "Now" : `W${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[#b1ada5] mt-3">Messages sent per week (last 7 weeks)</p>
          </div>

          {/* ── Mood Distribution ── */}
          {stats && Object.keys(stats.moodCounts).length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                Mood patterns
              </p>
              <div className="space-y-3">
                {Object.entries(stats.moodCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mood, count]) => {
                    const total = Object.values(stats.moodCounts).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={mood} className="flex items-center gap-3">
                        <span className="text-lg w-7 text-center">{MOOD_EMOJI[mood] ?? "?"}</span>
                        <div className="flex-1">
                          <div className="h-3 bg-[#ede7dd] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#8d4837] to-[#c47a6b] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-[#7a766f] w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Top Tags ── */}
          {stats && stats.topTags.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                Most journaled themes
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6d2e20] bg-[#fce4dc] px-3 py-1.5 rounded-full"
                  >
                    {tag}
                    <span className="text-[10px] text-[#8d4837]/60">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Growth Edge Reminder ── */}
          {archetype && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-xs font-medium tracking-wide uppercase text-[#81502b] mb-3">
                Remember your growth edge
              </p>
              <p className="text-sm text-[#312e29] leading-relaxed italic">
                &ldquo;{archetype.growthEdge}&rdquo;
              </p>
            </div>
          )}

          {/* ── Quick Links ── */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/journal")}
              className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm text-left hover:bg-white hover:shadow-md transition-all"
            >
              <span className="text-xl mb-2 block">📓</span>
              <p className="text-sm font-semibold text-[#312e29]">Journal</p>
              <p className="text-xs text-[#7a766f]">Log a moment</p>
            </button>
            <button
              type="button"
              onClick={() => router.push("/exercises")}
              className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm text-left hover:bg-white hover:shadow-md transition-all"
            >
              <span className="text-xl mb-2 block">🏋️</span>
              <p className="text-sm font-semibold text-[#312e29]">Exercises</p>
              <p className="text-xs text-[#7a766f]">Practice a skill</p>
            </button>
          </div>
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          Growth takes time. Every conversation counts.
        </p>
      </footer>
    </div>
  );
}
