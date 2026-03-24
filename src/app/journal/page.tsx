"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface JournalEntry {
  id: string;
  content: string;
  mood: string | null;
  tags: string[];
  photo_url: string | null;
  entry_date: string | null;
  created_at: string;
}

const MOODS = [
  { value: "great", label: "Radiant", emoji: "☀️" },
  { value: "good", label: "Warm", emoji: "🌤️" },
  { value: "okay", label: "Cloudy", emoji: "☁️" },
  { value: "tough", label: "Stormy", emoji: "🌧️" },
  { value: "hard", label: "Heavy", emoji: "⛈️" },
];

const TAGS = [
  "communication", "conflict", "connection", "gratitude",
  "boundary", "growth", "intimacy", "trust", "repair",
];

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [entryDate, setEntryDate] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/journal");
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setEntries(data as JournalEntry[]);
      setLoading(false);
    }

    load();
  }, [router]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Photo must be under 5MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSaveError(null);
  }

  function removePhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    if (!userId) return null;
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("journal-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("[journal] Photo upload failed:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("journal-photos")
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  async function handleSave() {
    if (!content.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();

    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile);
    }

    if (editingId) {
      const updateData: Record<string, unknown> = {
        content: content.trim(),
        mood,
        tags: selectedTags,
      };
      if (entryDate) updateData.entry_date = entryDate;
      if (photoUrl) updateData.photo_url = photoUrl;

      const { error } = await supabase
        .from("journal_entries")
        .update(updateData)
        .eq("id", editingId);

      if (error) {
        console.error("[journal] Update failed:", error.message);
        setSaveError("Failed to update entry. Please try again.");
        setSaving(false);
        return;
      }

      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, content: content.trim(), mood, tags: selectedTags, ...(photoUrl ? { photo_url: photoUrl } : {}), ...(entryDate ? { entry_date: entryDate } : {}) }
            : e
        )
      );
    } else {
      const insertData: Record<string, unknown> = {
        user_id: userId,
        content: content.trim(),
        mood,
        tags: selectedTags,
      };
      if (entryDate) insertData.entry_date = entryDate;
      if (photoUrl) insertData.photo_url = photoUrl;

      const { data, error } = await supabase
        .from("journal_entries")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("[journal] Insert failed:", error.message, error.details, error.hint);
        setSaveError(`Failed to save: ${error.message}`);
        setSaving(false);
        return;
      }

      if (data) {
        setEntries((prev) => [data as JournalEntry, ...prev]);
      }
    }

    setSaveError(null);
    resetForm();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id);

    if (!error) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  function startEdit(entry: JournalEntry) {
    setContent(entry.content);
    setMood(entry.mood);
    setSelectedTags(entry.tags ?? []);
    setEntryDate(entry.entry_date || "");
    setEditingId(entry.id);
    if (entry.photo_url) setPhotoPreview(entry.photo_url);
    setShowForm(true);
  }

  function resetForm() {
    setContent("");
    setMood(null);
    setSelectedTags([]);
    setEntryDate("");
    setEditingId(null);
    setShowForm(false);
    removePhoto();
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto stagger-in">
          {/* Header */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors mb-8 flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back home
          </button>

          <div className="flex items-center justify-between mb-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] tracking-tight">
              Growth Journal
            </h1>
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-4 py-2.5 text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Capture moment
            </button>
          </div>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            The small moments shape the big picture. What you write here helps your coach understand your world.
          </p>

          {/* ── New Entry Form ── */}
          {showForm && (
            <div className="glass-card p-6 mb-6 animate-scale-in">
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                {editingId ? "Edit moment" : "What\u2019s on your heart?"}
              </p>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="A look they gave you. Something left unsaid. A small win you want to remember..."
                className="w-full bg-[#f6f0e6] border border-[#e2dcd1] rounded-xl px-4 py-3 text-sm text-[#312e29] placeholder:text-[#b1ada5] resize-none focus:outline-none focus:border-[#8d4837]/30 transition-colors"
                rows={4}
              />

              {/* Date picker */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-[#7a766f] mb-2">When did this happen?</p>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full bg-[#f6f0e6] border border-[#e2dcd1] rounded-xl px-4 py-2.5 text-sm text-[#312e29] focus:outline-none focus:border-[#8d4837]/30 transition-colors"
                  />
                </div>
              </div>

              {/* Photo upload */}
              <div className="mt-4">
                <p className="text-xs text-[#7a766f] mb-2">Attach a memory</p>
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-xl border border-[#e2dcd1]"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 bg-[#f6f0e6] border border-dashed border-[#e2dcd1] rounded-xl text-sm text-[#7a766f] hover:border-[#8d4837]/30 hover:text-[#8d4837] transition-all w-full justify-center"
                  >
                    <span className="material-symbols-outlined text-lg">add_a_photo</span>
                    Add a photo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Mood selector */}
              <div className="mt-4">
                <p className="text-xs text-[#7a766f] mb-2">The weather between you two</p>
                <div className="flex gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(mood === m.value ? null : m.value)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all ${
                        mood === m.value
                          ? "bg-[#8d4837]/10 border border-[#8d4837]/30 text-[#6d2e20]"
                          : "bg-[#f6f0e6] border border-transparent text-[#7a766f] hover:bg-[#ebe7e0]"
                      }`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="mt-4">
                <p className="text-xs text-[#7a766f] mb-2">What is this about?</p>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-[#8d4837] text-white"
                          : "bg-[#f6f0e6] text-[#7a766f] hover:bg-[#ebe7e0]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {saveError && (
                <p className="text-sm text-[#b41340] mt-3">{saveError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-4 py-3 text-white text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Save this moment"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[#e2dcd1] bg-white/50 px-4 py-3 text-sm text-[#7a766f] hover:text-[#312e29] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Entries ── */}
          {entries.length === 0 && !showForm ? (
            <div className="text-center py-16 animate-fade-up">
              <div className="relative mx-auto mb-5 w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-[#8d4837]/10 blur-xl scale-125" />
                <div className="relative h-20 w-20 rounded-full bg-[#8d4837]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-[#8d4837]">auto_stories</span>
                </div>
              </div>
              <h3 className="font-heading text-xl font-semibold text-[#312e29] mb-2">
                Your story starts here
              </h3>
              <p className="text-sm text-[#7a766f] max-w-xs mx-auto mb-6">
                Capture the moments that matter — the breakthroughs, the tension, the quiet shifts.
                Your coach learns from what you share.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-6 py-3 text-white text-sm font-medium hover:shadow-md transition-all mb-8"
              >
                Write your first moment
              </button>

              <div className="text-left max-w-xs mx-auto">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-3">Not sure what to write?</p>
                <ul className="space-y-2.5 text-sm text-[#7a766f]">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#8d4837] shrink-0">&bull;</span>
                    A moment where you felt close to or distant from your partner
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#8d4837] shrink-0">&bull;</span>
                    Something they said that stuck with you
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#8d4837] shrink-0">&bull;</span>
                    A conflict you handled differently than usual
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#8d4837] shrink-0">&bull;</span>
                    Something you wish you&apos;d said but didn&apos;t
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 stagger-children">
              {entries.map((entry) => {
                const moodInfo = MOODS.find((m) => m.value === entry.mood);
                const displayDate = entry.entry_date
                  ? new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : formatDate(entry.created_at);
                return (
                  <div
                    key={entry.id}
                    className="glass-card card-hover group overflow-hidden"
                  >
                    {/* Photo */}
                    {entry.photo_url && (
                      <img
                        src={entry.photo_url}
                        alt=""
                        className="w-full h-48 object-cover"
                      />
                    )}

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          {moodInfo && (
                            <span className="inline-flex items-center gap-1.5 bg-[#8d4837]/[0.07] px-2 py-0.5 rounded-full" title={moodInfo.label}>
                              <span className="text-sm">{moodInfo.emoji}</span>
                              <span className="text-[10px] font-medium text-[#8d4837]">{moodInfo.label}</span>
                            </span>
                          )}
                          <span className="text-xs text-[#7a766f]">
                            {displayDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            className="p-1.5 rounded-lg text-[#7a766f] hover:text-[#8d4837] hover:bg-[#8d4837]/5 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 rounded-lg text-[#7a766f] hover:text-[#b41340] hover:bg-[#b41340]/5 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-[#312e29] leading-relaxed whitespace-pre-wrap">
                        {entry.content}
                      </p>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] tracking-wider uppercase font-medium text-[#8d4837] bg-[#fce4dc] px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          Everything here stays between you and your coach.
        </p>
      </footer>
    </div>
  );
}
