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
  const [shareCopied, setShareCopied] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);

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

          setAvatarUrl(data.avatar_url || null);
          setUsername(data.username || null);
          setBio(data.bio || "");
          setIsPublic(data.is_public || false);

          // Get memory count
          const { count } = await supabase
            .from("memories")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          setMemoryCount(count ?? 0);

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
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { archetype } = profile;

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      {/* ── Profile Hero ── */}
      <div className="px-6 pt-8 pb-6">
        <div className="max-w-lg mx-auto text-center stagger-in">
          {/* Top nav row: Back + Edit */}
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-sm text-[#7a766f] font-medium hover:text-[#312e29] transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Home
            </button>
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => router.push("/profile/edit")}
                className="flex items-center gap-1 text-sm text-[#8d4837] font-medium hover:text-[#6d2e20] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit
              </button>
            )}
          </div>

          {/* Avatar / Archetype badge */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 shadow-lg border-2 border-white/80"
            />
          ) : (
            <div
              className="h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${archetype.color}20, ${archetype.color}40)`,
                border: `2px solid ${archetype.color}30`,
              }}
            >
              <span className="text-4xl">{archetype.emoji}</span>
            </div>
          )}

          <h1 className="font-heading text-2xl font-semibold text-[#312e29]">
            {profile.name}
          </h1>
          {username && (
            <p className="text-sm text-[#7a766f] mt-0.5">@{username}</p>
          )}

          {/* Archetype badge */}
          <div
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: `${archetype.color}12`,
              color: archetype.color,
              border: `1px solid ${archetype.color}25`,
            }}
          >
            <span>{archetype.emoji}</span>
            {archetype.name}
          </div>

          <p className="text-sm text-[#7a766f] italic mt-2">
            &ldquo;{archetype.tagline}&rdquo;
          </p>

          {bio && (
            <p className="text-[#5e5b54] text-base leading-relaxed max-w-sm mx-auto mt-3">
              {bio}
            </p>
          )}

          <p className="text-[#5e5b54] text-sm leading-relaxed max-w-md mx-auto mt-3">
            {archetype.description}
          </p>

          {/* Stats row */}
          {isLoggedIn && (
            <div className="flex items-center justify-center gap-6 mt-5">
              <button
                type="button"
                onClick={() => router.push("/profile/memories")}
                className="text-center hover:opacity-70 transition-opacity"
              >
                <p className="text-lg font-semibold text-[#312e29]">{memoryCount}</p>
                <p className="text-xs text-[#7a766f]">memories</p>
              </button>
              <div className="w-px h-8 bg-[#e2dcd1]" />
              <div className="text-center">
                <p className="text-lg font-semibold text-[#312e29]">
                  {isPublic ? (
                    <span className="material-symbols-outlined text-lg text-[#3a6355]">public</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg text-[#b1ada5]">lock</span>
                  )}
                </p>
                <p className="text-xs text-[#7a766f]">{isPublic ? "Public" : "Private"}</p>
              </div>
            </div>
          )}

          {/* Share archetype button */}
          <button
            type="button"
            onClick={async () => {
              const payload = JSON.stringify({
                name: archetype.name,
                tagline: archetype.tagline,
                emoji: archetype.emoji,
              });
              const encoded = encodeURIComponent(btoa(payload));
              const url = `${window.location.origin}/share/${encoded}`;

              if (navigator.share) {
                try {
                  await navigator.share({ title: `I'm a ${archetype.name} — RelAI`, url });
                  return;
                } catch { /* user cancelled */ }
              }
              try {
                await navigator.clipboard.writeText(url);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              } catch { /* ignore */ }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#e2dcd1] bg-white/60 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-[#8d4837] hover:bg-white hover:border-[#b1ada5] transition-all"
          >
            {shareCopied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Link copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                Share your archetype
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Strengths & Blind Spots ── */}
      <div className="px-6 pb-6">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-4 stagger-in">
          {/* Strengths */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">
              Your strengths
            </p>
            <ul className="space-y-2">
              {archetype.strengths.map((s) => (
                <li key={s} className="text-sm text-[#312e29] flex items-start gap-2">
                  <span className="text-[#8d4837] shrink-0 mt-0.5">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Blind spots */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium tracking-wide uppercase text-[#b41340] mb-3">
              Blind spots
            </p>
            <ul className="space-y-2">
              {archetype.blindSpots.map((b) => (
                <li key={b} className="text-sm text-[#312e29] flex items-start gap-2">
                  <span className="text-[#b41340] shrink-0 mt-0.5">!</span>
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
            <p className="text-[#312e29] text-base leading-relaxed italic">
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
            className="w-full text-center text-sm text-[#8d4837] font-medium py-3 hover:text-[#6d2e20] transition-colors flex items-center justify-center gap-2"
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
                color="#8d4837"
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
                color="#7a766f"
              />

              {/* Love Language */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#b41340] mb-4">
                  Love Language
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#7a766f] mb-1">You need</p>
                    <p className="text-base font-semibold text-[#312e29]">
                      {profile.loveLanguage.receivingLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#7a766f] mb-1">You give</p>
                    <p className="text-base font-semibold text-[#312e29]">
                      {profile.loveLanguage.givingLabel}
                    </p>
                  </div>
                </div>
                {profile.loveLanguage.receiving !== profile.loveLanguage.giving && (
                  <p className="text-sm text-[#7a766f] mt-4 leading-relaxed">
                    You give love differently from how you need to receive it. This gap is common — and worth being aware of.
                  </p>
                )}
              </div>

              {/* Goal */}
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#3a6355] mb-2">
                  Your Focus
                </p>
                <p className="text-base font-semibold text-[#312e29]">
                  {profile.goalLabel}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── What to do next ── */}
      <div className="px-6 pb-6">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">What to do with this</p>
          <div className="space-y-3">
            {[
              { text: "Talk to your coach about your growth edge — it\u2019ll ask the right follow-up questions", icon: "chat" },
              { text: "Share your archetype with your partner and compare — this is where the biggest insights happen", icon: "share" },
              { text: "Try a guided exercise that targets your blind spots", icon: "fitness_center" },
            ].map((item) => (
              <div key={item.icon} className="flex gap-3 items-start bg-white/50 border border-[#e2dcd1] rounded-xl p-4">
                <span className="material-symbols-outlined text-[#8d4837] text-lg shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-sm text-[#5e5b54] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      {isLoggedIn && (
        <div className="px-6 pb-4">
          <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile/memories")}
              className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined text-xl text-[#8d4837]">photo_library</span>
              <span className="text-sm font-medium text-[#312e29]">Memories</span>
              <span className="text-xs text-[#7a766f]">Photos & moments</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/community")}
              className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined text-xl text-[#8d4837]">group</span>
              <span className="text-sm font-medium text-[#312e29]">Community</span>
              <span className="text-xs text-[#7a766f]">Browse archetypes</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CTAs ── */}
      <div className="px-6 pb-20">
        <div className="max-w-lg mx-auto space-y-3">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
            >
              Start chatting with your coach
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/auth?next=/profile")}
              className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
            >
              Create free account to save & chat
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/partner")}
            className="w-full rounded-xl border border-[#81502b]/30 bg-[#81502b]/5 px-5 py-3.5 text-sm font-medium text-[#81502b] hover:bg-[#81502b]/10 hover:border-[#81502b]/50 transition-all flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Invite your partner
          </button>

          {username && isPublic && (
            <button
              type="button"
              onClick={() => router.push(`/u/${username}`)}
              className="w-full rounded-xl border border-[#e2dcd1] bg-white/60 px-5 py-3.5 text-sm font-medium text-[#8d4837] hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">open_in_new</span>
              View public profile
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("relai-quiz");
              localStorage.removeItem("relai-profile");
              router.push("/quiz");
            }}
            className="w-full rounded-xl border border-[#e2dcd1] bg-white/50 px-5 py-3 text-sm text-[#7a766f] hover:text-[#312e29] hover:bg-white transition-all"
          >
            Retake quiz
          </button>
        </div>
      </div>

      {/* ── Footer disclaimer ── */}
      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
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
    <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-6 shadow-sm">
      <p className="text-xs font-medium tracking-wide uppercase mb-3" style={{ color }}>
        {label}
      </p>
      <h3 className="text-lg font-semibold text-[#312e29] mb-2">{title}</h3>
      <p className="text-sm text-[#5e5b54] leading-relaxed">{description}</p>
    </div>
  );
}
