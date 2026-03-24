"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Memory {
  id: string;
  caption: string;
  photo_url: string | null;
  memory_date: string;
  is_public: boolean;
}

export default function MemoriesPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // New memory form
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .order("memory_date", { ascending: false });

      setMemories(data ?? []);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be under 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setCaption("");
    setMemoryDate(new Date().toISOString().split("T")[0]);
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSave() {
    if (!userId || !caption.trim()) return;
    setSaving(true);

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("memory-photos")
          .upload(path, photoFile);

        if (uploadError) {
          alert("Photo upload failed. Please try again.");
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("memory-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      if (editingId) {
        const updates: Record<string, unknown> = {
          caption: caption.trim(),
          memory_date: memoryDate,
        };
        if (photoUrl) updates.photo_url = photoUrl;

        await supabase.from("memories").update(updates).eq("id", editingId);

        setMemories((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? { ...m, caption: caption.trim(), memory_date: memoryDate, photo_url: photoUrl || m.photo_url }
              : m
          )
        );
      } else {
        const { data } = await supabase
          .from("memories")
          .insert({
            user_id: userId,
            caption: caption.trim(),
            photo_url: photoUrl,
            memory_date: memoryDate,
            is_public: true,
          })
          .select()
          .single();

        if (data) {
          setMemories((prev) => [data, ...prev]);
        }
      }

      resetForm();
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this memory?")) return;
    await supabase.from("memories").delete().eq("id", id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  async function toggleVisibility(id: string, currentlyPublic: boolean) {
    await supabase.from("memories").update({ is_public: !currentlyPublic }).eq("id", id);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_public: !currentlyPublic } : m))
    );
  }

  function startEdit(memory: Memory) {
    setEditingId(memory.id);
    setCaption(memory.caption);
    setMemoryDate(memory.memory_date);
    setPhotoPreview(memory.photo_url);
    setShowForm(true);
  }

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
          <h1 className="font-heading text-lg font-semibold text-[#312e29]">Memories</h1>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="text-sm text-[#8d4837] font-medium hover:text-[#6d2e20] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New
          </button>
        </div>
      </div>

      <div className="px-6 pb-20">
        <div className="max-w-lg mx-auto">
          {/* New/Edit form */}
          {showForm && (
            <div className="bg-white/80 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 mb-6 shadow-sm msg-enter">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                {editingId ? "Edit memory" : "New memory"}
              </p>

              {/* Photo upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-[#b1ada5] bg-white/50 mb-4 overflow-hidden"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <span className="material-symbols-outlined text-3xl text-[#b1ada5] mb-2">add_photo_alternate</span>
                    <p className="text-sm text-[#b1ada5]">Add a photo (optional)</p>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {/* Caption */}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                rows={3}
                className="w-full rounded-xl border border-[#e2dcd1] bg-white/70 px-4 py-3 text-[#312e29] text-base focus:outline-none focus:border-[#8d4837] focus:ring-1 focus:ring-[#8d4837]/20 transition-all resize-none mb-3"
                placeholder="What made this moment special?"
                autoFocus
              />

              {/* Date */}
              <input
                type="date"
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
                className="w-full rounded-xl border border-[#e2dcd1] bg-white/70 px-4 py-3 text-[#312e29] text-sm focus:outline-none focus:border-[#8d4837] focus:ring-1 focus:ring-[#8d4837]/20 transition-all mb-4"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-[#e2dcd1] bg-white/50 py-3 text-sm text-[#7a766f] hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !caption.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] py-3 text-sm text-white font-medium hover:shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* Memories list */}
          {memories.length === 0 && !showForm ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-[#e2dcd1] mb-4 block">photo_library</span>
              <p className="text-[#7a766f] mb-1">No memories yet</p>
              <p className="text-sm text-[#b1ada5] mb-6">
                Capture the moments that matter in your relationship
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-6 py-3 text-sm text-white font-medium hover:shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add your first memory
              </button>
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
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-[#b1ada5]">
                          {new Date(memory.memory_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleVisibility(memory.id, memory.is_public)}
                          className="text-xs text-[#b1ada5] hover:text-[#7a766f] flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {memory.is_public ? "visibility" : "visibility_off"}
                          </span>
                          {memory.is_public ? "Public" : "Private"}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(memory)}
                          className="text-[#b1ada5] hover:text-[#7a766f] transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(memory.id)}
                          className="text-[#b1ada5] hover:text-[#b41340] transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
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
