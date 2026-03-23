"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface JournalEntry {
  id: string;
  content: string;
  mood: string | null;
  tags: string[];
  created_at: string;
}

const MOODS = [
  { value: "great", label: "Great", emoji: "😊" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "okay", label: "Okay", emoji: "😐" },
  { value: "tough", label: "Tough", emoji: "😔" },
  { value: "hard", label: "Hard", emoji: "😢" },
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
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

  async function handleSave() {
    if (!content.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();

    if (editingId) {
      const { error } = await supabase
        .from("journal_entries")
        .update({ content: content.trim(), mood, tags: selectedTags })
        .eq("id", editingId);

      if (!error) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? { ...e, content: content.trim(), mood, tags: selectedTags }
              : e
          )
        );
      }
    } else {
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: userId,
          content: content.trim(),
          mood,
          tags: selectedTags,
        })
        .select()
        .single();

      if (!error && data) {
        setEntries((prev) => [data as JournalEntry, ...prev]);
      }
    }

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
    setEditingId(entry.id);
    setShowForm(true);
  }

  function resetForm() {
    setContent("");
    setMood(null);
    setSelectedTags([]);
    setEditingId(null);
    setShowForm(false);
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
        <div className="w-8 h-8 border-2 border-[#4a7c6b] border-t-transparent rounded-full animate-spin" />
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
            className="text-sm text-[#8a7a66] hover:text-[#4a7c6b] transition-colors mb-8 flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back to chat
          </button>

          <div className="flex items-center justify-between mb-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#1a1008] tracking-tight">
              Journal
            </h1>
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-4 py-2.5 text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New entry
            </button>
          </div>
          <p className="text-[#8a7a66] text-base leading-relaxed mb-8">
            Log relationship moments. Your AI coach will reference these in sessions.
          </p>

          {/* ── New Entry Form ── */}
          {showForm && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-6 shadow-sm mb-6 msg-enter">
              <p className="text-xs font-medium tracking-wide uppercase text-[#4a7c6b] mb-4">
                {editingId ? "Edit entry" : "New entry"}
              </p>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What happened today in your relationship? A moment of connection, a conflict, a realization..."
                className="w-full bg-[#f5f2ee] border border-[#e8e4df] rounded-xl px-4 py-3 text-sm text-[#2d2418] placeholder:text-[#c4bbaf] resize-none focus:outline-none focus:border-[#4a7c6b]/30 transition-colors"
                rows={4}
              />

              {/* Mood selector */}
              <div className="mt-4">
                <p className="text-xs text-[#8a7a66] mb-2">How are you feeling?</p>
                <div className="flex gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(mood === m.value ? null : m.value)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all ${
                        mood === m.value
                          ? "bg-[#4a7c6b]/10 border border-[#4a7c6b]/30 text-[#2d4e43]"
                          : "bg-[#f5f2ee] border border-transparent text-[#8a7a66] hover:bg-[#ebe7e0]"
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
                <p className="text-xs text-[#8a7a66] mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-[#4a7c6b] text-white"
                          : "bg-[#f5f2ee] text-[#8a7a66] hover:bg-[#ebe7e0]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-4 py-3 text-white text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Save entry"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[#e8e4df] bg-white/50 px-4 py-3 text-sm text-[#8a7a66] hover:text-[#1a1008] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Entries ── */}
          {entries.length === 0 && !showForm ? (
            <div className="text-center py-16">
              <div className="h-20 w-20 rounded-full bg-[#4a7c6b]/10 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">📓</span>
              </div>
              <h3 className="font-heading text-xl font-semibold text-[#1a1008] mb-2">
                Start your journal
              </h3>
              <p className="text-sm text-[#8a7a66] max-w-xs mx-auto mb-6">
                Log moments from your relationship — breakthroughs, conflicts, realizations.
                Your AI coach will reference these in your sessions.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-6 py-3 text-white text-sm font-medium hover:shadow-md transition-all"
              >
                Write your first entry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const moodInfo = MOODS.find((m) => m.value === entry.mood);
                return (
                  <div
                    key={entry.id}
                    className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8a7a66]">
                          {formatDate(entry.created_at)}
                        </span>
                        {moodInfo && (
                          <span className="text-sm" title={moodInfo.label}>
                            {moodInfo.emoji}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="p-1.5 rounded-lg text-[#8a7a66] hover:text-[#4a7c6b] hover:bg-[#4a7c6b]/5 transition-all"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 rounded-lg text-[#8a7a66] hover:text-[#c45c5c] hover:bg-[#c45c5c]/5 transition-all"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-[#2d2418] leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] tracking-wider uppercase font-medium text-[#4a7c6b] bg-[#d4e6df] px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center border-t border-[#e8e4df]/60">
        <p className="text-[10px] text-[#c4bbaf] tracking-wide">
          Your journal entries are private and encrypted.
        </p>
      </footer>
    </div>
  );
}
