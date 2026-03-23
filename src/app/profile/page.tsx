"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/quiz/compute-profile";
import { createClient } from "@/lib/supabase/client";
import { getArchetype } from "@/lib/quiz/archetypes";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          const archetype = data.attachment_style && data.communication_style && data.conflict_response
            ? getArchetype(
                data.attachment_style.primary,
                data.communication_style.primary,
                data.conflict_response.primary
              )
            : undefined;

          setProfile({
            name: data.name,
            relationshipStatus: data.relationship_status,
            relationshipLength: data.relationship_length,
            archetype: archetype ?? getArchetype("secure", "comm-direct", "conflict-repair"),
            attachmentStyle: data.attachment_style,
            communicationStyle: data.communication_style,
            conflictResponse: data.conflict_response,
            loveLanguage: data.love_language,
            goal: data.goal,
            goalLabel: data.goal_label,
            scores: data.scores ?? {},
          });
          return;
        }
      }

      // Fall back to localStorage
      const saved = localStorage.getItem("relai-profile");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Backfill archetype for older profiles
          if (!parsed.archetype) {
            parsed.archetype = getArchetype(
              parsed.attachmentStyle?.primary ?? "secure",
              parsed.communicationStyle?.primary ?? "comm-direct",
              parsed.conflictResponse?.primary ?? "conflict-repair"
            );
          }
          setProfile(parsed);
        } catch {
          router.push("/quiz");
        }
      } else {
        router.push("/quiz");
      }
    }

    load();
  }, [router]);

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4a7c6b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { archetype } = profile;

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      {/* ── Archetype Hero ── */}
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto text-center stagger-in">
          {/* Archetype emoji badge */}
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${archetype.color}20, ${archetype.color}40)`,
              border: `2px solid ${archetype.color}30`,
            }}
          >
            <span className="text-4xl">{archetype.emoji}</span>
          </div>

          <p className="text-xs tracking-[0.2em] uppercase font-medium mb-3" style={{ color: archetype.color }}>
            Your relationship archetype
          </p>

          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-[#1a1008] mb-3 tracking-tight">
            {archetype.name}
          </h1>

          <p className="text-lg text-[#8a7a66] italic mb-6">
            &ldquo;{archetype.tagline}&rdquo;
          </p>

          <p className="text-[#6b5b47] text-base leading-relaxed max-w-md mx-auto">
            {archetype.description}
          </p>
        </div>
      </div>

      {/* ── Strengths & Blind Spots ── */}
      <div className="px-6 pb-6">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-4 stagger-in">
          {/* Strengths */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium tracking-wide uppercase text-[#4a7c6b] mb-3">
              Your strengths
            </p>
            <ul className="space-y-2">
              {archetype.strengths.map((s) => (
                <li key={s} className="text-sm text-[#2d2418] flex items-start gap-2">
                  <span className="text-[#4a7c6b] shrink-0 mt-0.5">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Blind spots */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium tracking-wide uppercase text-[#c45c5c] mb-3">
              Blind spots
            </p>
            <ul className="space-y-2">
              {archetype.blindSpots.map((b) => (
                <li key={b} className="text-sm text-[#2d2418] flex items-start gap-2">
                  <span className="text-[#c45c5c] shrink-0 mt-0.5">!</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Growth Edge ── */}
      <div className="px-6 pb-6">
        <div className="max-w-lg mx-auto">
          <div
            className="rounded-2xl p-6 shadow-sm msg-enter"
            style={{
              background: `linear-gradient(135deg, ${archetype.color}08, ${archetype.color}15)`,
              border: `1px solid ${archetype.color}20`,
            }}
          >
            <p className="text-xs font-medium tracking-wide uppercase mb-3" style={{ color: archetype.color }}>
              Your growth edge
            </p>
            <p className="text-[#2d2418] text-base leading-relaxed italic">
              &ldquo;{archetype.growthEdge}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── Trait Details (expandable) ── */}
      <div className="px-6 pb-6">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-center text-sm text-[#4a7c6b] font-medium py-3 hover:text-[#2d4e43] transition-colors flex items-center justify-center gap-2"
          >
            {showDetails ? "Hide" : "See"} your full trait breakdown
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${showDetails ? "rotate-180" : ""}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showDetails && (
            <div className="space-y-4 stagger-in">
              <ProfileCard
                label="Attachment Style"
                title={profile.attachmentStyle.label}
                description={profile.attachmentStyle.description}
                color="#4a7c6b"
              />
              <ProfileCard
                label="Communication Style"
                title={profile.communicationStyle.label}
                description={profile.communicationStyle.description}
                color="#6b8f82"
              />
              <ProfileCard
                label="Conflict Response"
                title={profile.conflictResponse.label}
                description={profile.conflictResponse.description}
                color="#8a7a66"
              />

              {/* Love Language */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#c45c5c] mb-4">
                  Love Language
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#8a7a66] mb-1">You need</p>
                    <p className="text-base font-semibold text-[#1a1008]">
                      {profile.loveLanguage.receivingLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#8a7a66] mb-1">You give</p>
                    <p className="text-base font-semibold text-[#1a1008]">
                      {profile.loveLanguage.givingLabel}
                    </p>
                  </div>
                </div>
                {profile.loveLanguage.receiving !== profile.loveLanguage.giving && (
                  <p className="text-sm text-[#8a7a66] mt-4 leading-relaxed">
                    You give love differently from how you need to receive it. This gap is common — and worth being aware of.
                  </p>
                )}
              </div>

              {/* Goal */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#3a6355] mb-2">
                  Your Focus
                </p>
                <p className="text-base font-semibold text-[#1a1008]">
                  {profile.goalLabel}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CTAs ── */}
      <div className="px-6 pb-20">
        <div className="max-w-lg mx-auto space-y-3">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
            >
              Start chatting with your coach
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/auth?next=/profile")}
              className="w-full rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
            >
              Create free account to save & chat
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("relai-quiz");
              localStorage.removeItem("relai-profile");
              router.push("/quiz");
            }}
            className="w-full rounded-xl border border-[#e8e4df] bg-white/50 px-5 py-3 text-sm text-[#8a7a66] hover:text-[#1a1008] hover:bg-white transition-all"
          >
            Retake quiz
          </button>
        </div>
      </div>

      {/* ── Footer disclaimer ── */}
      <footer className="px-6 py-6 text-center border-t border-[#e8e4df]/60">
        <p className="text-[10px] text-[#c4bbaf] tracking-wide">
          RelAI is a relationship coaching tool, not a replacement for licensed therapy.
        </p>
      </footer>
    </div>
  );
}

function ProfileCard({
  label,
  title,
  description,
  color,
}: {
  label: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm">
      <p className="text-xs font-medium tracking-wide uppercase mb-3" style={{ color }}>
        {label}
      </p>
      <h3 className="text-lg font-semibold text-[#1a1008] mb-2">{title}</h3>
      <p className="text-sm text-[#6b5b47] leading-relaxed">{description}</p>
    </div>
  );
}
