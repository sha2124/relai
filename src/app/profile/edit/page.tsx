"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype } from "@/lib/quiz/archetypes";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [archetype, setArchetype] = useState<{ emoji: string; color: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setName(data.name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || null);
        setIsPublic(data.is_public || false);

        if (data.attachment_style?.primary && data.communication_style?.primary && data.conflict_response?.primary) {
          const arch = getArchetype(data.attachment_style.primary, data.communication_style.primary, data.conflict_response.primary);
          setArchetype({ emoji: arch.emoji, color: arch.color });
        }
      }
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function validateUsername(value: string) {
    const clean = value.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    setUsername(clean);
    if (clean.length > 0 && clean.length < 3) {
      setUsernameError("At least 3 characters");
    } else if (clean.length > 30) {
      setUsernameError("Max 30 characters");
    } else {
      setUsernameError("");
    }
  }

  async function handleSave() {
    if (!userId || usernameError) return;
    setSaving(true);

    try {
      // Check username uniqueness
      if (username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", username)
          .neq("user_id", userId)
          .maybeSingle();

        if (existing) {
          setUsernameError("Username taken");
          setSaving(false);
          return;
        }
      }

      // Upload avatar if changed
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) {
          alert("Photo upload failed. Please try again.");
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        finalAvatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          username: username || null,
          bio,
          avatar_url: finalAvatarUrl,
          is_public: isPublic,
        })
        .eq("user_id", userId);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="flex items-center gap-1 text-sm text-[#7a766f] hover:text-[#312e29] transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Profile
          </button>
          <h1 className="font-heading text-lg font-semibold text-[#312e29]">Edit Profile</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="px-6 pb-20">
        <div className="max-w-lg mx-auto space-y-6 stagger-in">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile photo"
                  className="w-28 h-28 rounded-full object-cover border-2 border-[#e2dcd1] shadow-md"
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-dashed border-[#b1ada5] bg-white/50"
                >
                  {archetype ? (
                    <span className="text-4xl">{archetype.emoji}</span>
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-[#b1ada5]">person</span>
                  )}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-[#b1ada5] mt-2">Tap to upload photo</p>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium tracking-wide uppercase text-[#7a766f] mb-1.5 block">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#e2dcd1] bg-white/70 px-4 py-3 text-[#312e29] text-base focus:outline-none focus:border-[#8d4837] focus:ring-1 focus:ring-[#8d4837]/20 transition-all"
              placeholder="Your name"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-xs font-medium tracking-wide uppercase text-[#7a766f] mb-1.5 block">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b1ada5] text-base">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => validateUsername(e.target.value)}
                className="w-full rounded-xl border border-[#e2dcd1] bg-white/70 pl-8 pr-4 py-3 text-[#312e29] text-base focus:outline-none focus:border-[#8d4837] focus:ring-1 focus:ring-[#8d4837]/20 transition-all"
                placeholder="choose a username"
              />
            </div>
            {usernameError && (
              <p className="text-xs text-[#b41340] mt-1">{usernameError}</p>
            )}
            {username && !usernameError && (
              <p className="text-xs text-[#7a766f] mt-1">
                relai-pi.vercel.app/u/{username}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-medium tracking-wide uppercase text-[#7a766f] mb-1.5 block">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              rows={3}
              className="w-full rounded-xl border border-[#e2dcd1] bg-white/70 px-4 py-3 text-[#312e29] text-base focus:outline-none focus:border-[#8d4837] focus:ring-1 focus:ring-[#8d4837]/20 transition-all resize-none"
              placeholder="A little about your relationship journey..."
            />
            <p className="text-xs text-[#b1ada5] text-right mt-1">{bio.length}/160</p>
          </div>

          {/* Public toggle */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-[#312e29]">Public profile</p>
                <p className="text-sm text-[#7a766f] mt-0.5">
                  Others can see your archetype, bio & memories
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  isPublic ? "bg-[#8d4837]" : "bg-[#e2dcd1]"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    isPublic ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !!usernameError}
            className={`w-full rounded-xl px-5 py-4 text-white font-semibold text-base transition-all ${
              saved
                ? "bg-[#3a6355]"
                : "bg-gradient-to-r from-[#8d4837] to-[#6d2e20] hover:shadow-md"
            } disabled:opacity-50`}
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
