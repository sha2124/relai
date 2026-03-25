"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";

interface ProfileData {
  name: string;
  attachment_style: { primary: string; label?: string; description?: string };
  communication_style: { primary: string; label?: string; description?: string };
  conflict_response: { primary: string; label?: string; description?: string };
}

interface Dynamic {
  type: "strength" | "tension" | "growth" | "pattern" | "complement";
  title: string;
  description: string;
  for_partner1: string;
  for_partner2: string;
  evidence: string;
}

interface CoupleInsights {
  compatibility_score: number;
  dynamics: Dynamic[];
  summary: string;
  next_conversation: string;
  analyzedAt?: string;
}

const TYPE_CONFIG: Record<
  Dynamic["type"],
  { emoji: string; label: string; color: string; bgColor: string; borderColor: string }
> = {
  strength: {
    emoji: "\u{1F4AA}",
    label: "Strength",
    color: "text-[#3a6355]",
    bgColor: "bg-[#3a6355]/10",
    borderColor: "border-l-[#3a6355]",
  },
  tension: {
    emoji: "\u26A1",
    label: "Tension Point",
    color: "text-[#b41340]",
    bgColor: "bg-[#b41340]/10",
    borderColor: "border-l-[#b41340]",
  },
  growth: {
    emoji: "\u{1F331}",
    label: "Growth Opportunity",
    color: "text-[#705900]",
    bgColor: "bg-[#705900]/10",
    borderColor: "border-l-[#705900]",
  },
  pattern: {
    emoji: "\u{1F504}",
    label: "Pattern",
    color: "text-[#81502b]",
    bgColor: "bg-[#81502b]/10",
    borderColor: "border-l-[#81502b]",
  },
  complement: {
    emoji: "\u{1F9E9}",
    label: "Complement",
    color: "text-[#8d4837]",
    bgColor: "bg-[#8d4837]/10",
    borderColor: "border-l-[#8d4837]",
  },
};

export default function PartnerBridgePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPartner, setNoPartner] = useState(false);
  const [insights, setInsights] = useState<CoupleInsights | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Partner data
  const [myName, setMyName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [myArchetype, setMyArchetype] = useState<Archetype | null>(null);
  const [partnerArchetype, setPartnerArchetype] = useState<Archetype | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/partner-bridge");
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

      // Find linked partner — check both as creator and as invitee
      let partnerId: string | null = null;
      let foundLinkId: string | null = null;

      const { data: asCreator } = await supabase
        .from("partner_links")
        .select("id, partner_id")
        .eq("user_id", user.id)
        .eq("status", "linked")
        .limit(1)
        .maybeSingle();

      if (asCreator?.partner_id) {
        partnerId = asCreator.partner_id;
        foundLinkId = asCreator.id;
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
          foundLinkId = asInvitee.id;
        }
      }

      if (!partnerId) {
        setNoPartner(true);
        setLoading(false);
        return;
      }

      setPartnerUserId(partnerId);
      setLinkId(foundLinkId);

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

      // Check for recent partner insights (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentInsights } = await supabase
        .from("partner_insights")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .gte("generated_at", sevenDaysAgo.toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentInsights) {
        setInsights({
          compatibility_score: recentInsights.compatibility_score,
          dynamics: recentInsights.insights as Dynamic[],
          summary: recentInsights.summary,
          next_conversation: recentInsights.next_conversation,
          analyzedAt: recentInsights.generated_at,
        });
      }

      setLoading(false);
    }

    load();
  }, [router]);

  const generateInsights = useCallback(async () => {
    if (!myUserId || !partnerUserId || !myProfile || !partnerProfile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch my messages and journal
      const [myMsgsRes, myJournalRes] = await Promise.all([
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

      const myArchetypeStr = myArchetype
        ? `${myArchetype.name} — ${myArchetype.tagline}`
        : `${myProfile.attachment_style.primary} attachment, ${myProfile.communication_style.primary} communicator, ${myProfile.conflict_response.primary} conflict style`;

      const partnerArchetypeStr = partnerArchetype
        ? `${partnerArchetype.name} — ${partnerArchetype.tagline}`
        : `${partnerProfile.attachment_style.primary} attachment, ${partnerProfile.communication_style.primary} communicator, ${partnerProfile.conflict_response.primary} conflict style`;

      const res = await fetch("/api/partner-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user1: {
            name: myName,
            archetype: myArchetypeStr,
            messages: myMsgsRes.data ?? [],
            journalEntries: myJournalRes.data ?? [],
          },
          user2: {
            name: partnerName,
            archetype: partnerArchetypeStr,
            messages: [],
            journalEntries: [],
          },
        }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();

      const coupleInsights: CoupleInsights = {
        compatibility_score: data.compatibility_score,
        dynamics: data.dynamics,
        summary: data.summary,
        next_conversation: data.next_conversation,
        analyzedAt: data.analyzedAt,
      };

      setInsights(coupleInsights);

      // Save to Supabase
      await supabase.from("partner_insights").insert({
        link_id: linkId,
        user1_id: myUserId,
        user2_id: partnerUserId,
        insights: data.dynamics,
        compatibility_score: data.compatibility_score,
        summary: data.summary,
        next_conversation: data.next_conversation,
      });
    } catch (err) {
      console.error("[partner-bridge] Error:", err);
      setError("Something went wrong generating your couple insights. Try again?");
    } finally {
      setAnalyzing(false);
    }
  }, [myUserId, partnerUserId, myProfile, partnerProfile, myArchetype, partnerArchetype, myName, partnerName, linkId]);

  function handleCopyLink() {
    const url = `${window.location.origin}/partner-bridge`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

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
              Partner Bridge
            </h1>
            <p className="text-[#7a766f] text-base leading-relaxed mb-8">
              See what makes your relationship unique — powered by AI analysis of both your patterns.
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
                Partner Bridge analyzes both your patterns to reveal your unique couple dynamics. Link your partner to get started.
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
            Partner Bridge
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            Your relationship dynamics, analyzed by AI.
          </p>

          {/* Couple header */}
          {myArchetype && partnerArchetype && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${myArchetype.color}20, ${myArchetype.color}40)`,
                      border: `2px solid ${myArchetype.color}30`,
                    }}
                  >
                    <span className="text-xl">{myArchetype.emoji}</span>
                  </div>
                  <p className="text-sm font-medium text-[#312e29]">{myName || "You"}</p>
                  <p className="text-[10px] text-[#7a766f] uppercase tracking-wider">{myArchetype.name}</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{"\u{1F309}"}</span>
                  <span className="text-[10px] text-[#7a766f] uppercase tracking-wider font-medium">Bridge</span>
                </div>

                <div className="text-center">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${partnerArchetype.color}20, ${partnerArchetype.color}40)`,
                      border: `2px solid ${partnerArchetype.color}30`,
                    }}
                  >
                    <span className="text-xl">{partnerArchetype.emoji}</span>
                  </div>
                  <p className="text-sm font-medium text-[#312e29]">{partnerName || "Partner"}</p>
                  <p className="text-[10px] text-[#7a766f] uppercase tracking-wider">{partnerArchetype.name}</p>
                </div>
              </div>

              {/* Compatibility score */}
              {insights?.compatibility_score != null && (
                <div className="text-center pt-2 border-t border-[#e2dcd1]">
                  <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mt-3 mb-2">Current Alignment</p>
                  <div className="relative inline-flex items-center justify-center">
                    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke="#e2dcd1"
                        strokeWidth="6"
                      />
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke="url(#scoreGradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${(insights.compatibility_score / 100) * 264} 264`}
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8d4837" />
                          <stop offset="100%" stopColor="#705900" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute font-heading text-2xl font-bold text-[#312e29]">
                      {insights.compatibility_score}
                    </span>
                  </div>
                  <p className="text-xs text-[#7a766f] mt-1">
                    Not a prediction — a snapshot of how attuned you are right now
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No insights yet — generate button */}
          {!insights && !analyzing && !error && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm text-center">
              <span className="text-4xl mb-4 block">{"\u2728"}</span>
              <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
                Ready to discover your dynamics?
              </h2>
              <p className="text-sm text-[#7a766f] leading-relaxed mb-6">
                Our AI will analyze your coaching conversations and both your archetypes to reveal what makes your relationship unique.
              </p>
              <button
                type="button"
                onClick={generateInsights}
                className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
              >
                Generate couple insights
              </button>
              <p className="text-xs text-[#7a766f] mt-4 leading-relaxed">
                For deeper insights, ask your partner to visit this page too — when both of you have data, the analysis gets richer.
              </p>
            </div>
          )}

          {/* Analyzing state */}
          {analyzing && (
            <div className="space-y-4 pt-2">
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm text-center">
                <div className="w-12 h-12 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
                  Analyzing your relationship dynamics...
                </h2>
                <p className="text-sm text-[#7a766f] leading-relaxed">
                  Looking at both your patterns, archetypes, and conversations to find what makes you two special.
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
                onClick={generateInsights}
                className="px-5 py-2.5 rounded-full bg-[#8d4837] text-white text-sm font-medium hover:bg-[#7a3d2f] transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Insights display */}
          {insights && !analyzing && (
            <div className="space-y-4">
              {/* Analyzed at + refresh */}
              {insights.analyzedAt && (
                <div className="flex items-center justify-between text-sm text-[#7a766f]">
                  <span>
                    Analyzed:{" "}
                    {new Date(insights.analyzedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={generateInsights}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-[#e2dcd1] text-[#5c5650] hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Refresh
                  </button>
                </div>
              )}

              {/* Dynamic insight cards */}
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-1">
                Your Couple Dynamics
              </p>

              {insights.dynamics.map((dynamic, index) => {
                const config = TYPE_CONFIG[dynamic.type];
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
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      className="w-full text-left p-5 focus:outline-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.bgColor}`}>
                          <span className="text-lg">{config.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium uppercase tracking-wide ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                          <h3 className="font-heading font-semibold text-[#2c2825] text-[15px] leading-snug">
                            {dynamic.title}
                          </h3>
                          {!isExpanded && (
                            <p className="text-sm text-[#5c5650] mt-1 line-clamp-2">
                              {dynamic.description}
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
                          {dynamic.description}
                        </p>

                        {/* Per-partner suggestions */}
                        <div className="space-y-3">
                          <div className="bg-[#fcf6ed] rounded-xl p-3.5">
                            <p className="text-xs font-medium text-[#8d4837] mb-1.5">
                              For {myName || "You"}:
                            </p>
                            <p className="text-sm text-[#5c5650] leading-relaxed">
                              {dynamic.for_partner1}
                            </p>
                          </div>
                          <div className="bg-[#fcf6ed] rounded-xl p-3.5">
                            <p className="text-xs font-medium text-[#8d4837] mb-1.5">
                              For {partnerName || "Partner"}:
                            </p>
                            <p className="text-sm text-[#5c5650] leading-relaxed">
                              {dynamic.for_partner2}
                            </p>
                          </div>
                        </div>

                        {/* Evidence */}
                        {dynamic.evidence && (
                          <div className="border-l-2 border-[#d4cec4] pl-3 py-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-[#7a766f] mb-1">
                              Based on
                            </p>
                            <p className="text-[13px] text-[#7a766f] italic leading-relaxed">
                              {dynamic.evidence}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Summary card */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-6 shadow-sm mt-6">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                  The Big Picture
                </p>
                <p className="text-sm text-[#312e29] leading-relaxed">
                  {insights.summary}
                </p>
              </div>

              {/* Conversation starter */}
              {insights.next_conversation && (
                <div
                  className="rounded-2xl p-6 shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #8d483708, #70590015)",
                    border: "1px solid #8d483720",
                  }}
                >
                  <p className="text-xs font-medium tracking-wide uppercase text-[#705900] mb-3">
                    Start a Conversation About This
                  </p>
                  <p className="text-sm text-[#312e29] leading-relaxed italic mb-4">
                    &ldquo;{insights.next_conversation}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem(
                        "insightContext",
                        `Partner Bridge insight — conversation starter: ${insights.next_conversation}\n\nCouple summary: ${insights.summary}`
                      );
                      router.push("/");
                    }}
                    className="w-full py-3 rounded-xl bg-[#8d4837] text-white font-medium text-sm hover:bg-[#7a3d2f] transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    Practice with coach
                  </button>
                </div>
              )}

              {/* Bottom actions */}
              <div className="space-y-3 pt-4 pb-8">
                <button
                  type="button"
                  onClick={generateInsights}
                  disabled={analyzing}
                  className="w-full py-3.5 rounded-2xl bg-white/70 border border-[#e2dcd1] text-[#312e29] font-medium text-sm hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  Refresh insights
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-3.5 rounded-2xl bg-white/70 border border-[#e2dcd1] text-[#312e29] font-medium text-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                  {copied ? "Link copied!" : "Share with partner"}
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
