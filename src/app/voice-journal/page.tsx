"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";

interface JournalEntry {
  id: string;
  content: string;
  mood: string | null;
  tags: string[];
  created_at: string;
}

export default function VoiceJournalPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/voice-journal");
        return;
      }

      setUserId(user.id);

      // Load past voice journal entries
      const { data } = await supabase
        .from("journal_entries")
        .select("id, content, mood, tags, created_at")
        .eq("user_id", user.id)
        .contains("tags", ["voice-note"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setEntries(data as JournalEntry[]);
      setLoading(false);
    }

    load();
  }, [router]);

  async function handleSaveToJournal() {
    if (!userId || !transcript.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        content: transcript.trim(),
        tags: ["voice-note"],
      })
      .select()
      .single();

    if (!error && data) {
      setEntries((prev) => [data as JournalEntry, ...prev]);
      setTranscript("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  }

  function handleTalkToCoach() {
    if (!transcript.trim()) return;
    // Store the transcript and redirect to chat
    localStorage.setItem("relai-exercise-prompt", transcript.trim());
    router.push("/");
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
      <header className="glass-white border-b border-[#e2dcd1]/60 px-6 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg text-[#7a766f] hover:text-[#312e29] hover:bg-[#ede7dd] transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[15px] font-semibold text-[#312e29] tracking-tight font-heading">Voice Journal</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Hero section */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#312e29] mb-3 tracking-tight">
            Voice Journal
          </h2>
          <p className="text-[#7a766f] text-[15px] leading-relaxed max-w-md mx-auto">
            Sometimes it&apos;s easier to talk than type. Record your thoughts and we&apos;ll save them.
          </p>
        </div>

        {/* Recording area */}
        <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm mb-8">
          <div className="flex flex-col items-center gap-6">
            {/* Large microphone */}
            <VoiceRecorder
              onTranscript={(text) =>
                setTranscript((prev) => (prev ? prev + " " + text : text))
              }
              size="lg"
            />

            <p className="text-sm text-[#b1ada5]">
              {transcript ? "Tap the mic to add more" : "Tap to start recording"}
            </p>
          </div>

          {/* Transcript area */}
          {transcript && (
            <div className="mt-6 space-y-4 animate-fade-up">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-xl border border-[#e2dcd1] bg-white px-4 py-3 text-[15px] text-[#312e29] placeholder:text-[#b1ada5] focus:outline-none focus:ring-2 focus:ring-[#8d4837]/20 focus:border-[#8d4837]/40 transition-all"
                placeholder="Your transcript will appear here..."
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSaveToJournal}
                  disabled={saving || !transcript.trim()}
                  className="flex-1 bg-gradient-to-r from-[#8d4837] to-[#6d2e20] text-white rounded-xl px-5 py-3 text-sm font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  )}
                  Save to journal
                </button>
                <button
                  type="button"
                  onClick={handleTalkToCoach}
                  disabled={!transcript.trim()}
                  className="flex-1 bg-white border border-[#e2dcd1] text-[#312e29] rounded-xl px-5 py-3 text-sm font-medium hover:bg-[#f6f0e6] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Talk to coach about this
                </button>
              </div>

              <button
                type="button"
                onClick={() => setTranscript("")}
                className="text-xs text-[#b1ada5] hover:text-[#7a766f] transition-colors"
              >
                Clear transcript
              </button>
            </div>
          )}

          {/* Saved confirmation */}
          {saved && (
            <div className="mt-4 text-center text-sm text-[#4a7c59] font-medium animate-fade-up">
              Saved to your journal
            </div>
          )}
        </div>

        {/* Past voice entries */}
        {entries.length > 0 && (
          <section>
            <h3 className="font-heading font-semibold text-[#312e29] text-lg mb-4">Past voice notes</h3>
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs text-[#b1ada5]">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-xs bg-[#8d4837]/10 text-[#8d4837] px-2 py-0.5 rounded-full">
                      voice note
                    </span>
                  </div>
                  <p className="text-sm text-[#312e29] leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
