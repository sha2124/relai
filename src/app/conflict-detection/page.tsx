"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";

interface HorsemanData {
  count: number;
  examples: string[];
  antidote: string;
}

interface ConflictPattern {
  name: string;
  description: string;
  trigger: string;
  your_response: string;
  their_likely_response: string;
  cycle_effect: string;
  break_strategy: string;
}

interface ConflictAnalysis {
  escalation_score: number;
  four_horsemen: {
    criticism: HorsemanData;
    contempt: HorsemanData;
    defensiveness: HorsemanData;
    stonewalling: HorsemanData;
  };
  patterns: ConflictPattern[];
  hot_topics: string[];
  summary: string;
  positive_note: string;
  analyzedAt?: string;
}

interface ProfileData {
  name: string;
  attachment_style: { primary: string; label?: string; description?: string };
  communication_style: { primary: string; label?: string; description?: string };
  conflict_response: { primary: string; label?: string; description?: string };
}

const HORSEMAN_CONFIG = {
  criticism: { emoji: "\u{1F5E1}\uFE0F", label: "Criticism", description: "Attacking character instead of behavior" },
  contempt: { emoji: "\u{1F624}", label: "Contempt", description: "Superiority, mockery, or disrespect" },
  defensiveness: { emoji: "\u{1F6E1}\uFE0F", label: "Defensiveness", description: "Deflecting responsibility" },
  stonewalling: { emoji: "\u{1F9F1}", label: "Stonewalling", description: "Withdrawing or shutting down" },
} as const;

function getSeverityColor(count: number): { bg: string; text: string; border: string } {
  if (count === 0) return { bg: "bg-[#3a6355]/10", text: "text-[#3a6355]", border: "border-[#3a6355]/20" };
  if (count <= 2) return { bg: "bg-[#705900]/10", text: "text-[#705900]", border: "border-[#705900]/20" };
  if (count <= 5) return { bg: "bg-[#b46113]/10", text: "text-[#b46113]", border: "border-[#b46113]/20" };
  return { bg: "bg-[#b41340]/10", text: "text-[#b41340]", border: "border-[#b41340]/20" };
}

function getEscalationLabel(score: number): { label: string; color: string } {
  if (score <= 25) return { label: "Low", color: "#3a6355" };
  if (score <= 50) return { label: "Moderate", color: "#705900" };
  if (score <= 75) return { label: "High", color: "#b46113" };
  return { label: "Critical", color: "#b41340" };
}

function getEscalationGradient(score: number): string {
  if (score <= 25) return "#3a6355";
  if (score <= 50) return "#705900";
  if (score <= 75) return "#b46113";
  return "#b41340";
}

export default function ConflictDetectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPartner, setNoPartner] = useState(false);
  const [noMessages, setNoMessages] = useState(false);
  const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null);
  const [expandedHorseman, setExpandedHorseman] = useState<string | null>(null);
  const [expandedPattern, setExpandedPattern] = useState<number | null>(null);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [myArchetype, setMyArchetype] = useState<Archetype | null>(null);
  const [partnerArchetype, setPartnerArchetype] = useState<Archetype | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/conflict-detection");
        return;
      }

      setMyUserId(user.id);

      // Load my profile
      const { data: myProf } = await supabase
        .from("profiles")
        .select("name, attachment_style, communication_style, conflict_response")
        .eq("user_id", user.id)
        .single();

      if (myProf) {
        const p = myProf as ProfileData;
        setMyName(p.name);
        setMyProfile(p);
        setMyArchetype(
          getArchetype(
            p.attachment_style.primary,
            p.communication_style.primary,
            p.conflict_response.primary
          )
        );
      }

      // Find linked partner
      let partnerId: string | null = null;

      const { data: asCreator } = await supabase
        .from("partner_links")
        .select("id, partner_id")
        .eq("user_id", user.id)
        .eq("status", "linked")
        .limit(1)
        .maybeSingle();

      if (asCreator?.partner_id) {
        partnerId = asCreator.partner_id;
      } else {
        const { data: asInvitee } = await supabase
          .from("partner_links")
          .select("id, user_id")
          .eq("partner_id", user.id)
          .eq("status", "linked")
          .limit(1)
          .maybeSingle();

        if (asInvitee?.user_id) {
          partnerId = asInvitee.user_id;
        }
      }

      if (!partnerId) {
        setNoPartner(true);
        setLoading(false);
        return;
      }

      // Load partner profile
      const { data: partnerProf } = await supabase
        .from("profiles")
        .select("name, attachment_style, communication_style, conflict_response")
        .eq("user_id", partnerId)
        .single();

      if (partnerProf) {
        const pp = partnerProf as ProfileData;
        setPartnerName(pp.name);
        setPartnerProfile(pp);
        setPartnerArchetype(
          getArchetype(
            pp.attachment_style.primary,
            pp.communication_style.primary,
            pp.conflict_response.primary
          )
        );
      }

      // Check for cached analysis (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentAnalysis } = await supabase
        .from("conflict_patterns")
        .select("*")
        .eq("user_id", user.id)
        .gte("analyzed_at", sevenDaysAgo.toISOString())
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentAnalysis) {
        setAnalysis({
          escalation_score: recentAnalysis.escalation_score,
          four_horsemen: recentAnalysis.four_horsemen as ConflictAnalysis["four_horsemen"],
          patterns: (recentAnalysis.patterns as ConflictPattern[]) ?? [],
          hot_topics: ((recentAnalysis.patterns as Record<string, unknown>)?.hot_topics as string[]) ?? [],
          summary: recentAnalysis.summary,
          positive_note: ((recentAnalysis.patterns as Record<string, unknown>)?.positive_note as string) ?? "",
          analyzedAt: recentAnalysis.analyzed_at,
        });
      }

      // Check if user has messages
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!count || count === 0) {
        setNoMessages(true);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  const runAnalysis = useCallback(async () => {
    if (!myUserId || !myProfile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const supabase = createClient();

      const [msgsRes, journalRes] = await Promise.all([
        supabase
          .from("messages")
          .select("role, content, created_at")
          .eq("user_id", myUserId)
          .order("created_at", { ascending: true })
          .limit(100),
        supabase
          .from("journal_entries")
          .select("content, mood, tags, created_at")
          .eq("user_id", myUserId)
          .order("created_at", { ascending: true })
          .limit(50),
      ]);

      const userArchetypeStr = myArchetype
        ? `${myArchetype.name} — ${myArchetype.tagline}`
        : `${myProfile.attachment_style.primary} attachment, ${myProfile.communication_style.primary} communicator, ${myProfile.conflict_response.primary} conflict style`;

      const partnerArchetypeStr = partnerArchetype
        ? `${partnerArchetype.name} — ${partnerArchetype.tagline}`
        : partnerProfile
          ? `${partnerProfile.attachment_style.primary} attachment, ${partnerProfile.communication_style.primary} communicator, ${partnerProfile.conflict_response.primary} conflict style`
          : "Unknown archetype";

      const res = await fetch("/api/conflict-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgsRes.data ?? [],
          journalEntries: journalRes.data ?? [],
          userArchetype: userArchetypeStr,
          partnerArchetype: partnerArchetypeStr,
          partnerName: partnerName || "your partner",
        }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();

      const conflictAnalysis: ConflictAnalysis = {
        escalation_score: data.escalation_score,
        four_horsemen: data.four_horsemen,
        patterns: data.patterns,
        hot_topics: data.hot_topics,
        summary: data.summary,
        positive_note: data.positive_note,
        analyzedAt: data.analyzedAt,
      };

      setAnalysis(conflictAnalysis);
      setNoMessages(false);

      // Save to Supabase
      await supabase.from("conflict_patterns").insert({
        user_id: myUserId,
        partner_id: null,
        patterns: { patterns: data.patterns, hot_topics: data.hot_topics, positive_note: data.positive_note },
        four_horsemen: data.four_horsemen,
        escalation_score: data.escalation_score,
        summary: data.summary,
      });
    } catch (err) {
      console.error("[conflict-detection] Error:", err);
      setError("Something went wrong analyzing your patterns. Try again?");
    } finally {
      setAnalyzing(false);
    }
  }, [myUserId, myProfile, myArchetype, partnerArchetype, partnerProfile, partnerName]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No partner linked
  if (noPartner) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm">
        <div className="px-6 pt-12 pb-8">
          <div className="max-w-lg mx-auto stagger-in">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors mb-8 flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Back to chat
            </button>

            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
              Conflict Map
            </h1>
            <p className="text-[#7a766f] text-base leading-relaxed mb-8">
              Understanding your patterns is the first step to changing them.
            </p>

            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm text-center">
              <div className="h-20 w-20 rounded-full bg-[#8d4837]/10 border-2 border-[#8d4837]/20 flex items-center justify-center mx-auto mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8d4837" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
                Link your partner first
              </h2>
              <p className="text-sm text-[#7a766f] leading-relaxed mb-6">
                Conflict Map analyzes your patterns in the context of your relationship. Link your partner so we can understand both sides.
              </p>
              <button
                type="button"
                onClick={() => router.push("/partner")}
                className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
              >
                Go to Partner Linking
              </button>
            </div>
          </div>
        </div>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back to chat
          </button>

          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
            Conflict Map
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            Understanding your patterns is the first step to changing them.
          </p>

          {/* No messages empty state */}
          {noMessages && !analysis && !analyzing && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm text-center">
              <span className="text-4xl mb-4 block">{"\u{1F4AC}"}</span>
              <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
                Start chatting first
              </h2>
              <p className="text-sm text-[#7a766f] leading-relaxed mb-6">
                Have a few conversations with your AI coach about your relationship — talk about conflicts, frustrations, or recurring arguments. Then come back here to see your patterns mapped out.
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
              >
                Start a conversation
              </button>
            </div>
          )}

          {/* Generate button — no cached analysis */}
          {!noMessages && !analysis && !analyzing && !error && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm text-center">
              <span className="text-4xl mb-4 block">{"\u26A1"}</span>
              <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
                Ready to map your conflict patterns?
              </h2>
              <p className="text-sm text-[#7a766f] leading-relaxed mb-6">
                We&apos;ll analyze your coaching conversations and both your archetypes to identify recurring patterns, triggers, and the dynamics at play when things get tense.
              </p>
              <button
                type="button"
                onClick={runAnalysis}
                className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
              >
                Analyze your patterns
              </button>
              <p className="text-xs text-[#7a766f] mt-4 leading-relaxed">
                Based on Gottman&apos;s research on the Four Horsemen of relationship conflict.
              </p>
            </div>
          )}

          {/* Analyzing state */}
          {analyzing && (
            <div className="space-y-4 pt-2">
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm text-center">
                <div className="w-12 h-12 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
                  Mapping your conflict patterns...
                </h2>
                <p className="text-sm text-[#7a766f] leading-relaxed">
                  Analyzing your conversations for recurring patterns, triggers, and the Four Horsemen indicators.
                </p>
              </div>
              {[1, 2, 3].map((i) => (
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
            </div>
          )}

          {/* Error state */}
          {error && !analyzing && (
            <div className="text-center py-12 space-y-4">
              <span className="material-symbols-outlined text-[48px] text-[#b41340]/40">
                error_outline
              </span>
              <p className="text-sm text-[#7a766f]">{error}</p>
              <button
                type="button"
                onClick={runAnalysis}
                className="px-5 py-2.5 rounded-full bg-[#8d4837] text-white text-sm font-medium hover:bg-[#7a3d2f] transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Analysis display */}
          {analysis && !analyzing && (
            <div className="space-y-5">
              {/* Analyzed at */}
              {analysis.analyzedAt && (
                <div className="flex items-center justify-between text-sm text-[#7a766f]">
                  <span>
                    Analyzed:{" "}
                    {new Date(analysis.analyzedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-[#e2dcd1] text-[#5c5650] hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Refresh
                  </button>
                </div>
              )}

              {/* Escalation Score */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                  Escalation Tendency
                </p>
                <div className="relative mb-3">
                  {/* Track */}
                  <div className="h-3 rounded-full overflow-hidden bg-[#ede7dd]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${analysis.escalation_score}%`,
                        background: `linear-gradient(90deg, #3a6355, #705900, #b46113, #b41340)`,
                      }}
                    />
                  </div>
                  {/* Marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md transition-all duration-700"
                    style={{
                      left: `calc(${analysis.escalation_score}% - 10px)`,
                      backgroundColor: getEscalationGradient(analysis.escalation_score),
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#b1ada5] uppercase tracking-wide">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
                <p
                  className="text-center mt-3 text-sm font-semibold"
                  style={{ color: getEscalationLabel(analysis.escalation_score).color }}
                >
                  {getEscalationLabel(analysis.escalation_score).label} — {analysis.escalation_score}/100
                </p>
              </div>

              {/* Four Horsemen */}
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-1">
                The Four Horsemen
              </p>
              <p className="text-xs text-[#7a766f] mb-3 leading-relaxed">
                Gottman&apos;s research identified four communication patterns that predict relationship difficulty. Here&apos;s what we notice in your conversations.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(HORSEMAN_CONFIG) as Array<keyof typeof HORSEMAN_CONFIG>).map((key) => {
                  const config = HORSEMAN_CONFIG[key];
                  const data = analysis.four_horsemen[key];
                  const severity = getSeverityColor(data.count);
                  const isExpanded = expandedHorseman === key;

                  return (
                    <div
                      key={key}
                      className={`bg-white/70 backdrop-blur-sm border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${
                        isExpanded ? "col-span-2" : ""
                      } ${severity.border}`}
                      style={{
                        animation: "fadeSlideUp 0.4s ease-out both",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedHorseman(isExpanded ? null : key)}
                        className="w-full text-left p-4 focus:outline-none"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">{config.emoji}</span>
                          {data.count === 0 ? (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-[#3a6355] bg-[#3a6355]/10 px-2 py-0.5 rounded-full">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                              Clear
                            </span>
                          ) : (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severity.bg} ${severity.text}`}>
                              {data.count}
                            </span>
                          )}
                        </div>
                        <p className="font-heading text-sm font-semibold text-[#312e29]">{config.label}</p>
                        <p className="text-[11px] text-[#7a766f] leading-snug mt-0.5">{config.description}</p>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 animate-[fadeIn_0.2s_ease-out]">
                          {data.count === 0 ? (
                            <div className="bg-[#3a6355]/5 rounded-xl p-3">
                              <p className="text-sm text-[#3a6355] font-medium">Not detected</p>
                              <p className="text-xs text-[#7a766f] mt-1 leading-relaxed">
                                We didn&apos;t find signs of {config.label.toLowerCase()} in your conversations. That&apos;s a real strength.
                              </p>
                            </div>
                          ) : (
                            <>
                              {data.examples.length > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-[#7a766f] font-medium mb-2">
                                    What we noticed
                                  </p>
                                  <div className="space-y-1.5">
                                    {data.examples.map((example, i) => (
                                      <div key={i} className="bg-[#fcf6ed] rounded-lg p-2.5">
                                        <p className="text-xs text-[#5c5650] italic leading-relaxed">
                                          &ldquo;{example}&rdquo;
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="bg-[#3a6355]/5 rounded-xl p-3 border-l-2 border-[#3a6355]">
                                <p className="text-[10px] uppercase tracking-wide text-[#3a6355] font-medium mb-1">
                                  The antidote
                                </p>
                                <p className="text-sm text-[#312e29] leading-relaxed">
                                  {data.antidote}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Conflict Patterns */}
              {analysis.patterns.length > 0 && (
                <>
                  <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mt-6 mb-3">
                    Recurring Patterns
                  </p>

                  {analysis.patterns.map((pattern, index) => {
                    const isExpanded = expandedPattern === index;

                    return (
                      <div
                        key={index}
                        className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl overflow-hidden shadow-sm transition-all duration-300"
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animation: "fadeSlideUp 0.4s ease-out both",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedPattern(isExpanded ? null : index)}
                          className="w-full text-left p-5 focus:outline-none"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#81502b]/10">
                              <span className="text-lg">{"\u{1F504}"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-heading font-semibold text-[#2c2825] text-[15px] leading-snug">
                                {pattern.name}
                              </h3>
                              {!isExpanded && (
                                <p className="text-sm text-[#5c5650] mt-1 line-clamp-2">
                                  {pattern.description}
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

                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-4 animate-[fadeIn_0.2s_ease-out]">
                            <p className="text-sm text-[#5c5650] leading-relaxed">
                              {pattern.description}
                            </p>

                            {/* Cycle flow */}
                            <div className="space-y-0">
                              {/* Trigger */}
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="w-7 h-7 rounded-full bg-[#b46113]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs">{"\u{1F525}"}</span>
                                  </div>
                                  <div className="w-0.5 h-4 bg-[#e2dcd1]" />
                                </div>
                                <div className="pb-2">
                                  <p className="text-[10px] uppercase tracking-wide text-[#b46113] font-medium">Trigger</p>
                                  <p className="text-sm text-[#312e29] leading-relaxed">{pattern.trigger}</p>
                                </div>
                              </div>

                              {/* Your response */}
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="w-7 h-7 rounded-full bg-[#8d4837]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs">{"\u{1F4AC}"}</span>
                                  </div>
                                  <div className="w-0.5 h-4 bg-[#e2dcd1]" />
                                </div>
                                <div className="pb-2">
                                  <p className="text-[10px] uppercase tracking-wide text-[#8d4837] font-medium">Your response</p>
                                  <p className="text-sm text-[#312e29] leading-relaxed">{pattern.your_response}</p>
                                </div>
                              </div>

                              {/* Their response */}
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="w-7 h-7 rounded-full bg-[#705900]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs">{"\u{1F5E3}\uFE0F"}</span>
                                  </div>
                                  <div className="w-0.5 h-4 bg-[#e2dcd1]" />
                                </div>
                                <div className="pb-2">
                                  <p className="text-[10px] uppercase tracking-wide text-[#705900] font-medium">{partnerName || "Their"} response</p>
                                  <p className="text-sm text-[#312e29] leading-relaxed">{pattern.their_likely_response}</p>
                                </div>
                              </div>

                              {/* Cycle effect */}
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="w-7 h-7 rounded-full bg-[#b41340]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs">{"\u{1F504}"}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-[#b41340] font-medium">Cycle effect</p>
                                  <p className="text-sm text-[#312e29] leading-relaxed">{pattern.cycle_effect}</p>
                                </div>
                              </div>
                            </div>

                            {/* Break strategy */}
                            <div className="bg-[#3a6355]/5 rounded-xl p-3.5 border-l-2 border-[#3a6355]">
                              <p className="text-[10px] uppercase tracking-wide text-[#3a6355] font-medium mb-1">
                                Break the cycle
                              </p>
                              <p className="text-sm text-[#312e29] leading-relaxed">
                                {pattern.break_strategy}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Hot Topics */}
              {analysis.hot_topics && analysis.hot_topics.length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                    Hot Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.hot_topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center text-sm font-medium text-[#6d2e20] bg-[#fce4dc] px-3 py-1.5 rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                  The Big Picture
                </p>
                <p className="text-sm text-[#312e29] leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              {/* Positive note */}
              {analysis.positive_note && (
                <div
                  className="rounded-2xl p-6 shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #3a635508, #3a635515)",
                    border: "1px solid #3a635520",
                  }}
                >
                  <p className="text-xs font-medium tracking-wide uppercase text-[#3a6355] mb-3">
                    What&apos;s going well
                  </p>
                  <p className="text-sm text-[#312e29] leading-relaxed italic">
                    &ldquo;{analysis.positive_note}&rdquo;
                  </p>
                </div>
              )}

              {/* Bottom actions */}
              <div className="space-y-3 pt-4 pb-8">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem(
                      "prefillPrompt",
                      `I just looked at my conflict map. Can you help me work on the patterns we identified? Here's what came up: ${analysis.summary}`
                    );
                    router.push("/");
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] text-white font-medium text-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  Practice with coach
                </button>

                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="w-full py-3.5 rounded-2xl bg-white/70 border border-[#e2dcd1] text-[#312e29] font-medium text-sm hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  Refresh analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          RelAI is a relationship coaching tool, not a replacement for licensed therapy.
        </p>
      </footer>

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
