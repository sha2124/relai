"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/quiz/compute-profile";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Try Supabase first
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          // Map DB columns back to UserProfile shape
          setProfile({
            name: data.name,
            relationshipStatus: data.relationship_status,
            relationshipLength: data.relationship_length,
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
          setProfile(JSON.parse(saved));
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

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      {/* Hero */}
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="relative inline-block mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4a7c6b] to-[#2d4e43] flex items-center justify-center avatar-glow mx-auto">
              <span className="text-white text-2xl font-semibold">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          <p className="text-xs tracking-[0.2em] uppercase text-[#4a7c6b] font-medium mb-3">
            Your Relationship Profile
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#1a1008] mb-2 tracking-tight">
            Hey, {profile.name}.
          </h1>
          <p className="text-[#8a7a66] text-base leading-relaxed">
            Here&apos;s what your answers reveal about how you connect, communicate, and love.
          </p>
        </div>
      </div>

      {/* Profile cards */}
      <div className="px-6 pb-20">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Attachment Style */}
          <ProfileCard
            emoji="\uD83D\uDD17"
            label="Attachment Style"
            title={profile.attachmentStyle.label}
            description={profile.attachmentStyle.description}
            color="#4a7c6b"
          />

          {/* Communication Style */}
          <ProfileCard
            emoji="\uD83D\uDCAC"
            label="Communication Style"
            title={profile.communicationStyle.label}
            description={profile.communicationStyle.description}
            color="#6b8f82"
          />

          {/* Conflict Response */}
          <ProfileCard
            emoji="\u26A1"
            label="Conflict Response"
            title={profile.conflictResponse.label}
            description={profile.conflictResponse.description}
            color="#8a7a66"
          />

          {/* Love Language */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm msg-enter">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{"\u2764\uFE0F"}</span>
              <span className="text-xs font-medium tracking-wide uppercase text-[#c45c5c]">
                Love Language
              </span>
            </div>
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
          <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm msg-enter">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{"\uD83C\uDFAF"}</span>
              <span className="text-xs font-medium tracking-wide uppercase text-[#3a6355]">
                Your Focus
              </span>
            </div>
            <p className="text-base font-semibold text-[#1a1008]">
              {profile.goalLabel}
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4 space-y-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
            >
              Start chatting with your coach
            </button>
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
      </div>
    </div>
  );
}

function ProfileCard({
  emoji,
  label,
  title,
  description,
  color,
}: {
  emoji: string;
  label: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm msg-enter">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{emoji}</span>
        <span
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-[#1a1008] mb-2">{title}</h3>
      <p className="text-sm text-[#6b5b47] leading-relaxed">{description}</p>
    </div>
  );
}
