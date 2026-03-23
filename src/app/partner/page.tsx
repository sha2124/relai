"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";

interface PartnerLink {
  id: string;
  invite_code: string;
  status: string;
  partner_id: string | null;
}

interface ProfileData {
  name: string;
  attachment_style: { primary: string };
  communication_style: { primary: string };
  conflict_response: { primary: string };
}

export default function PartnerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<PartnerLink | null>(null);
  const [myArchetype, setMyArchetype] = useState<Archetype | null>(null);
  const [partnerArchetype, setPartnerArchetype] = useState<Archetype | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/partner");
        return;
      }

      // Load my profile
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, attachment_style, communication_style, conflict_response")
        .eq("user_id", user.id)
        .single();

      if (myProfile) {
        const p = myProfile as ProfileData;
        setMyArchetype(
          getArchetype(
            p.attachment_style.primary,
            p.communication_style.primary,
            p.conflict_response.primary
          )
        );
      }

      // Load existing partner link
      const { data: existingLink } = await supabase
        .from("partner_links")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingLink) {
        setLink(existingLink as PartnerLink);

        // If linked, load partner profile
        if (existingLink.status === "linked" && existingLink.partner_id) {
          const { data: pProfile } = await supabase
            .from("profiles")
            .select("name, attachment_style, communication_style, conflict_response")
            .eq("user_id", existingLink.partner_id)
            .single();

          if (pProfile) {
            const pp = pProfile as ProfileData;
            setPartnerName(pp.name);
            setPartnerArchetype(
              getArchetype(
                pp.attachment_style.primary,
                pp.communication_style.primary,
                pp.conflict_response.primary
              )
            );
          }
        }
      }

      // Also check if I'm a partner in someone else's link
      if (!existingLink || existingLink.status === "pending") {
        const { data: asPartner, error: asPartnerError } = await supabase
          .from("partner_links")
          .select("*, user_id")
          .eq("partner_id", user.id)
          .eq("status", "linked")
          .limit(1)
          .single();

        if (asPartnerError) {
          console.warn("[partner] asPartner query failed (likely RLS):", asPartnerError.message);
        }

        if (asPartner) {
          // Mark as linked so the UI shows the linked state
          setLink({
            id: asPartner.id,
            invite_code: asPartner.invite_code,
            status: "linked",
            partner_id: asPartner.user_id, // the creator is "my partner"
          });

          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("name, attachment_style, communication_style, conflict_response")
            .eq("user_id", asPartner.user_id)
            .single();

          if (creatorProfile) {
            const cp = creatorProfile as ProfileData;
            setPartnerName(cp.name);
            setPartnerArchetype(
              getArchetype(
                cp.attachment_style.primary,
                cp.communication_style.primary,
                cp.conflict_response.primary
              )
            );
          }
        }
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function generateInvite() {
    setGenerating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const inviteCode = crypto.randomUUID();

    const { data, error } = await supabase
      .from("partner_links")
      .insert({
        user_id: user.id,
        invite_code: inviteCode,
        status: "pending",
      })
      .select()
      .single();

    if (!error && data) {
      setLink(data as PartnerLink);
    }
    setGenerating(false);
  }

  async function copyLink() {
    if (!link) return;
    const url = `${window.location.origin}/partner/join/${link.invite_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLinked = link?.status === "linked" || !!partnerArchetype;

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto stagger-in">
          {/* Header */}
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors mb-8 flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back to profile
          </button>

          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
            {isLinked ? "You & Your Partner" : "Partner Linking"}
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            {isLinked
              ? "See how your archetypes complement each other."
              : "Send an invite link to your partner. They can sign in with an existing account or create a new one."}
          </p>

          {/* ── Linked State ── */}
          {isLinked && myArchetype && partnerArchetype ? (
            <div className="space-y-6">
              {/* Side by side archetypes */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm text-center"
                >
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${myArchetype.color}20, ${myArchetype.color}40)`,
                      border: `2px solid ${myArchetype.color}30`,
                    }}
                  >
                    <span className="text-2xl">{myArchetype.emoji}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mb-1">You</p>
                  <p className="font-heading text-base font-semibold text-[#312e29]">
                    {myArchetype.name}
                  </p>
                  <p className="text-xs text-[#7a766f] italic mt-1">{myArchetype.tagline}</p>
                </div>

                <div
                  className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm text-center"
                >
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${partnerArchetype.color}20, ${partnerArchetype.color}40)`,
                      border: `2px solid ${partnerArchetype.color}30`,
                    }}
                  >
                    <span className="text-2xl">{partnerArchetype.emoji}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mb-1">
                    {partnerName ?? "Partner"}
                  </p>
                  <p className="font-heading text-base font-semibold text-[#312e29]">
                    {partnerArchetype.name}
                  </p>
                  <p className="text-xs text-[#7a766f] italic mt-1">{partnerArchetype.tagline}</p>
                </div>
              </div>

              {/* Compatibility insight */}
              <div
                className="rounded-2xl p-6 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${myArchetype.color}08, ${partnerArchetype.color}15)`,
                  border: `1px solid ${myArchetype.color}20`,
                }}
              >
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                  Compatibility Insight
                </p>
                <p className="text-[#312e29] text-sm leading-relaxed">
                  As a <strong>{myArchetype.name}</strong> paired with a <strong>{partnerArchetype.name}</strong>, your
                  relationship has a unique dynamic. Your strengths
                  ({myArchetype.strengths[0].toLowerCase()}) complement
                  theirs ({partnerArchetype.strengths[0].toLowerCase()}).
                  Watch for tension between your blind spot
                  ({myArchetype.blindSpots[0].toLowerCase()}) and theirs
                  ({partnerArchetype.blindSpots[0].toLowerCase()}).
                  Growth happens when you both lean into your edges.
                </p>
              </div>

              {/* Partner's strengths & blind spots */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                    {partnerName ? `${partnerName}'s` : "Their"} strengths
                  </p>
                  <ul className="space-y-2">
                    {partnerArchetype.strengths.map((s) => (
                      <li key={s} className="text-sm text-[#312e29] flex items-start gap-2">
                        <span className="text-[#8d4837] shrink-0 mt-0.5">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-medium tracking-wide uppercase text-[#b41340] mb-3">
                    {partnerName ? `${partnerName}'s` : "Their"} blind spots
                  </p>
                  <ul className="space-y-2">
                    {partnerArchetype.blindSpots.map((b) => (
                      <li key={b} className="text-sm text-[#312e29] flex items-start gap-2">
                        <span className="text-[#b41340] shrink-0 mt-0.5">!</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Partner's growth edge */}
              <div
                className="rounded-2xl p-5 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${partnerArchetype.color}08, ${partnerArchetype.color}15)`,
                  border: `1px solid ${partnerArchetype.color}20`,
                }}
              >
                <p className="text-xs font-medium tracking-wide uppercase mb-2" style={{ color: partnerArchetype.color }}>
                  {partnerName ? `${partnerName}'s` : "Their"} growth edge
                </p>
                <p className="text-sm text-[#312e29] leading-relaxed italic">
                  &ldquo;{partnerArchetype.growthEdge}&rdquo;
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
              >
                Start a coaching session together
              </button>
            </div>
          ) : (
            /* ── Invite State ── */
            <div className="space-y-6">
              {!link ? (
                <div className="text-center">
                  <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm mb-6">
                    <div className="h-20 w-20 rounded-full bg-[#81502b]/10 border-2 border-[#81502b]/20 flex items-center justify-center mx-auto mb-5">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#81502b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <line x1="19" y1="8" x2="19" y2="14"/>
                        <line x1="22" y1="11" x2="16" y2="11"/>
                      </svg>
                    </div>
                    <p className="text-[#312e29] text-base leading-relaxed mb-2">
                      Generate an invite link to share with your partner.
                      When they take the quiz, you will both see how your archetypes interact.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={generateInvite}
                    disabled={generating}
                    className="w-full rounded-xl bg-gradient-to-r from-[#81502b] to-[#6e401c] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all disabled:opacity-60"
                  >
                    {generating ? "Generating..." : "Generate invite link"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-6 shadow-sm">
                    <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
                      Your invite link
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/partner/join/${link.invite_code}`}
                        className="flex-1 bg-[#f6f0e6] border border-[#e2dcd1] rounded-lg px-3 py-2.5 text-sm text-[#312e29] truncate"
                      />
                      <button
                        type="button"
                        onClick={copyLink}
                        className="shrink-0 rounded-lg border border-[#e2dcd1] bg-white px-4 py-2.5 text-sm font-medium text-[#8d4837] hover:bg-[#f6f0e6] transition-all"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-xs text-[#7a766f] mt-3">
                      Share this link with your partner. They can sign in with an existing account or create a new one. If they haven&apos;t taken the quiz yet, they&apos;ll be guided through it first.
                    </p>
                  </div>

                  <div className="bg-[#81502b]/5 border border-[#81502b]/15 rounded-2xl p-5">
                    <p className="text-sm text-[#7a766f] flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#81502b]/40 animate-pulse" />
                      Waiting for your partner to join...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          RelAI is a relationship coaching tool, not a replacement for licensed therapy.
        </p>
      </footer>
    </div>
  );
}
