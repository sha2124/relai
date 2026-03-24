"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype } from "@/lib/quiz/archetypes";

interface CommunityProfile {
  name: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  archetype_emoji: string;
  archetype_name: string;
  archetype_color: string;
  memory_count: number;
}

export default function CommunityPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Get current user's username
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: own } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .single();
        if (own?.username) setCurrentUsername(own.username);
      }

      // Fetch all public profiles
      const { data: publicProfiles } = await supabase
        .from("profiles")
        .select("user_id, name, username, avatar_url, bio, attachment_style, communication_style, conflict_response")
        .eq("is_public", true)
        .not("username", "is", null)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!publicProfiles) {
        setLoading(false);
        return;
      }

      // Get memory counts for all users
      const userIds = publicProfiles.map((p) => p.user_id);
      const { data: memoryCounts } = await supabase
        .from("memories")
        .select("user_id")
        .in("user_id", userIds)
        .eq("is_public", true);

      const countMap: Record<string, number> = {};
      for (const m of memoryCounts ?? []) {
        countMap[m.user_id] = (countMap[m.user_id] || 0) + 1;
      }

      setProfiles(
        publicProfiles.map((p) => {
          const arch = p.attachment_style?.primary && p.communication_style?.primary && p.conflict_response?.primary
            ? getArchetype(p.attachment_style.primary, p.communication_style.primary, p.conflict_response.primary)
            : getArchetype("secure", "comm-direct", "conflict-repair");

          return {
            name: p.name,
            username: p.username,
            avatar_url: p.avatar_url,
            bio: p.bio || "",
            archetype_emoji: arch.emoji,
            archetype_name: arch.name,
            archetype_color: arch.color,
            memory_count: countMap[p.user_id] || 0,
          };
        })
      );

      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <div className="max-w-lg mx-auto text-center stagger-in">
          <p className="text-xs tracking-[0.2em] uppercase font-medium text-[#8d4837] mb-2">
            Community
          </p>
          <h1 className="font-heading text-3xl font-semibold text-[#312e29] mb-2">
            Stories & Archetypes
          </h1>
          <p className="text-[#7a766f] text-base">
            Real people on their relationship journey
          </p>
        </div>
      </div>

      {/* Your profile CTA */}
      {!currentUsername && (
        <div className="px-6 pb-4">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => router.push("/profile/edit")}
              className="w-full bg-white/70 backdrop-blur-sm border border-dashed border-[#8d4837]/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/90 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-[#8d4837]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#8d4837] text-lg">person_add</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[#312e29]">Create your public profile</p>
                <p className="text-xs text-[#7a766f]">Set a username and share your journey</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Profiles grid */}
      <div className="px-6 pb-20">
        <div className="max-w-lg mx-auto">
          {profiles.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-[#e2dcd1] mb-4 block">group</span>
              <p className="text-[#7a766f] mb-1">No public profiles yet</p>
              <p className="text-sm text-[#b1ada5]">Be the first to share your story</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((p) => (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => router.push(`/u/${p.username}`)}
                  className="w-full bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                >
                  {/* Avatar */}
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.name}
                      className="w-14 h-14 rounded-full object-cover border border-[#e2dcd1] shrink-0"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${p.archetype_color}15, ${p.archetype_color}30)`,
                        border: `1px solid ${p.archetype_color}25`,
                      }}
                    >
                      <span className="text-2xl">{p.archetype_emoji}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#312e29] truncate">{p.name}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: `${p.archetype_color}12`,
                          color: p.archetype_color,
                        }}
                      >
                        {p.archetype_emoji} {p.archetype_name}
                      </span>
                    </div>
                    <p className="text-sm text-[#7a766f] mt-0.5">@{p.username}</p>
                    {p.bio && (
                      <p className="text-sm text-[#5e5b54] mt-1 line-clamp-1">{p.bio}</p>
                    )}
                  </div>

                  {/* Memory count */}
                  {p.memory_count > 0 && (
                    <div className="text-center shrink-0">
                      <p className="text-sm font-semibold text-[#312e29]">{p.memory_count}</p>
                      <p className="text-[10px] text-[#b1ada5]">memories</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav hint */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-[#e2dcd1]/60 px-6 py-3 safe-area-pb">
        <div className="max-w-lg mx-auto flex justify-around">
          <button type="button" onClick={() => router.push("/")} className="flex flex-col items-center gap-0.5 text-[#7a766f]">
            <span className="material-symbols-outlined text-xl">chat</span>
            <span className="text-[10px]">Coach</span>
          </button>
          <button type="button" onClick={() => router.push("/exercises")} className="flex flex-col items-center gap-0.5 text-[#7a766f]">
            <span className="material-symbols-outlined text-xl">self_improvement</span>
            <span className="text-[10px]">Exercises</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-0.5 text-[#8d4837]">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <span className="text-[10px] font-medium">Community</span>
          </button>
          <button type="button" onClick={() => router.push("/profile")} className="flex flex-col items-center gap-0.5 text-[#7a766f]">
            <span className="material-symbols-outlined text-xl">person</span>
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
