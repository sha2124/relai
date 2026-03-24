"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";

interface Memory {
  id: string;
  caption: string;
  photo_url: string | null;
  memory_date: string;
  reaction_count: number;
  user_reacted: boolean;
}

interface PublicProfile {
  name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  archetype: Archetype;
  user_id: string;
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    async function load() {
      // Get current user (may be null)
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      // Fetch public profile by username
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();

      if (!profileData) {
        // Check if it's the user's own profile (even if not public)
        if (user) {
          const { data: ownData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .eq("username", username)
            .maybeSingle();

          if (ownData) {
            setIsOwnProfile(true);
            loadProfile(ownData, user.id);
            return;
          }
        }
        setNotFound(true);
        setLoading(false);
        return;
      }

      setIsOwnProfile(user?.id === profileData.user_id);
      loadProfile(profileData, user?.id ?? null);
    }

    async function loadProfile(data: Record<string, unknown>, viewerId: string | null) {
      const archetype = data.attachment_style && data.communication_style && data.conflict_response
        ? getArchetype(
            (data.attachment_style as { primary: string }).primary,
            (data.communication_style as { primary: string }).primary,
            (data.conflict_response as { primary: string }).primary
          )
        : getArchetype("secure", "comm-direct", "conflict-repair");

      setProfile({
        name: data.name as string,
        username: data.username as string,
        bio: (data.bio as string) || "",
        avatar_url: data.avatar_url as string | null,
        archetype,
        user_id: data.user_id as string,
      });

      // Load public memories
      const { data: memoriesData } = await supabase
        .from("memories")
        .select("id, caption, photo_url, memory_date, created_at")
        .eq("user_id", data.user_id as string)
        .eq("is_public", true)
        .order("memory_date", { ascending: false })
        .limit(50);

      if (memoriesData && memoriesData.length > 0) {
        // Get reaction counts
        const memoryIds = memoriesData.map((m) => m.id);
        const { data: reactionData } = await supabase
          .from("reactions")
          .select("memory_id, user_id")
          .in("memory_id", memoryIds);

        const countMap: Record<string, number> = {};
        const userReacted: Record<string, boolean> = {};
        for (const r of reactionData ?? []) {
          countMap[r.memory_id] = (countMap[r.memory_id] || 0) + 1;
          if (r.user_id === viewerId) userReacted[r.memory_id] = true;
        }

        setMemories(
          memoriesData.map((m) => ({
            id: m.id,
            caption: m.caption,
            photo_url: m.photo_url,
            memory_date: m.memory_date,
            reaction_count: countMap[m.id] || 0,
            user_reacted: userReacted[m.id] || false,
          }))
        );
      }

      setLoading(false);
    }

    load();
  }, [username, supabase, router]);

  async function toggleReaction(memoryId: string) {
    if (!currentUserId) {
      router.push("/auth");
      return;
    }

    const memory = memories.find((m) => m.id === memoryId);
    if (!memory) return;

    if (memory.user_reacted) {
      await supabase.from("reactions").delete().eq("user_id", currentUserId).eq("memory_id", memoryId);
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? { ...m, user_reacted: false, reaction_count: m.reaction_count - 1 }
            : m
        )
      );
    } else {
      await supabase.from("reactions").insert({ user_id: currentUserId, memory_id: memoryId });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? { ...m, user_reacted: true, reaction_count: m.reaction_count + 1 }
            : m
        )
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex flex-col items-center justify-center px-6">
        <span className="text-5xl mb-4">🔒</span>
        <h1 className="font-heading text-2xl font-semibold text-[#312e29] mb-2">Profile not found</h1>
        <p className="text-[#7a766f] text-center mb-6">This profile doesn&apos;t exist or is set to private.</p>
        <button
          type="button"
          onClick={() => router.push("/community")}
          className="rounded-xl border border-[#e2dcd1] bg-white/60 px-6 py-3 text-sm font-medium text-[#8d4837] hover:bg-white transition-all"
        >
          Browse community
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const { archetype } = profile;

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-[#7a766f] hover:text-[#312e29] transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => router.push("/profile/edit")}
              className="text-sm text-[#8d4837] font-medium hover:text-[#6d2e20] transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Profile Hero */}
      <div className="px-6 pt-4 pb-8">
        <div className="max-w-lg mx-auto text-center stagger-in">
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 shadow-lg border-2 border-white/80"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${archetype.color}20, ${archetype.color}40)`,
                border: `2px solid ${archetype.color}30`,
              }}
            >
              <span className="text-4xl">{archetype.emoji}</span>
            </div>
          )}

          <h1 className="font-heading text-2xl font-semibold text-[#312e29]">{profile.name}</h1>
          <p className="text-sm text-[#7a766f] mt-0.5">@{profile.username}</p>

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

          {profile.bio && (
            <p className="text-[#5e5b54] text-base leading-relaxed mt-4 max-w-sm mx-auto">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="text-center">
              <p className="text-lg font-semibold text-[#312e29]">{memories.length}</p>
              <p className="text-xs text-[#7a766f]">memories</p>
            </div>
            <div className="w-px h-8 bg-[#e2dcd1]" />
            <div className="text-center">
              <p className="text-lg font-semibold text-[#312e29]">
                {memories.reduce((sum, m) => sum + m.reaction_count, 0)}
              </p>
              <p className="text-xs text-[#7a766f]">hearts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Memories grid */}
      <div className="px-6 pb-20">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
            Memories
          </p>

          {memories.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-[#e2dcd1] mb-3 block">photo_library</span>
              <p className="text-sm text-[#b1ada5]">No memories shared yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl overflow-hidden shadow-sm"
                >
                  {memory.photo_url && (
                    <img
                      src={memory.photo_url}
                      alt={memory.caption}
                      className="w-full aspect-[4/3] object-cover"
                    />
                  )}
                  <div className="p-4">
                    <p className="text-[#312e29] text-base leading-relaxed">{memory.caption}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-[#b1ada5]">
                        {new Date(memory.memory_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleReaction(memory.id)}
                        className="flex items-center gap-1.5 text-sm transition-all"
                      >
                        <span
                          className={`material-symbols-outlined text-lg transition-all ${
                            memory.user_reacted
                              ? "text-[#b41340]"
                              : "text-[#b1ada5] hover:text-[#b41340]"
                          }`}
                          style={memory.user_reacted ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                          favorite
                        </span>
                        {memory.reaction_count > 0 && (
                          <span className={memory.user_reacted ? "text-[#b41340]" : "text-[#b1ada5]"}>
                            {memory.reaction_count}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
