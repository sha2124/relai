"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { createClient } from "@/lib/supabase/client";
import { getArchetype } from "@/lib/quiz/archetypes";

function buildProfileContext(
  name: string,
  relationshipStatus: string,
  attachmentStyle: { primary?: string; label?: string; description?: string } | undefined,
  communicationStyle: { primary?: string; label?: string; description?: string } | undefined,
  conflictResponse: { primary?: string; label?: string; description?: string } | undefined,
  loveLanguage: { receivingLabel?: string; givingLabel?: string } | undefined,
  goalLabel: string,
) {
  const archetype = attachmentStyle?.primary && communicationStyle?.primary && conflictResponse?.primary
    ? getArchetype(attachmentStyle.primary, communicationStyle.primary, conflictResponse.primary)
    : null;

  let ctx = `Name: ${name}\n`;
  if (archetype) {
    ctx += `Relationship Archetype: "${archetype.name}" — ${archetype.tagline}\n`;
    ctx += `Archetype description: ${archetype.description}\n`;
    ctx += `Strengths: ${archetype.strengths.join(", ")}\n`;
    ctx += `Blind spots: ${archetype.blindSpots.join(", ")}\n`;
    ctx += `Growth edge: ${archetype.growthEdge}\n`;
  }
  ctx += `Relationship status: ${relationshipStatus}\n`;
  ctx += `Attachment style: ${attachmentStyle?.label} — ${attachmentStyle?.description}\n`;
  ctx += `Communication style: ${communicationStyle?.label} — ${communicationStyle?.description}\n`;
  ctx += `Conflict response: ${conflictResponse?.label} — ${conflictResponse?.description}\n`;
  ctx += `Love language (needs): ${loveLanguage?.receivingLabel}\n`;
  ctx += `Love language (gives): ${loveLanguage?.givingLabel}\n`;
  ctx += `Goal: ${goalLabel}`;
  return ctx;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [userProfile, setUserProfile] = useState<string | undefined>();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showCrisis, setShowCrisis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load profile and conversation history from Supabase
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      setUserId(user.id);

      // Load profile from Supabase
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name ?? "");
        setUserProfile(buildProfileContext(
          profile.name,
          profile.relationship_status,
          profile.attachment_style,
          profile.communication_style,
          profile.conflict_response,
          profile.love_language,
          profile.goal_label,
        ));
      } else {
        // Fall back to localStorage
        const saved = localStorage.getItem("relai-profile");
        if (saved) {
          try {
            const p = JSON.parse(saved);
            setUserName(p.name ?? "");
            setUserProfile(buildProfileContext(
              p.name,
              p.relationshipStatus,
              p.attachmentStyle,
              p.communicationStyle,
              p.conflictResponse,
              p.loveLanguage,
              p.goalLabel,
            ));
          } catch {
            // ignore
          }
        }
      }

      // Load recent conversation history (last 50 messages)
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (history && history.length > 0) {
        setMessages(history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      }

      setLoadingHistory(false);
    }

    load();
  }, [router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function saveMessage(role: "user" | "assistant", content: string) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("messages").insert({
      user_id: userId,
      role,
      content,
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("relai-profile");
    localStorage.removeItem("relai-quiz");
    router.push("/");
    router.refresh();
  }

  async function handleSend(content: string) {
    const userMessage: Message = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);

    // Save user message to DB
    saveMessage("user", content);

    setMessages([...updatedMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, userProfile }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantContent += data.text;
                setMessages([
                  ...updatedMessages,
                  { role: "assistant", content: assistantContent },
                ]);
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }

      // Save assistant message to DB
      if (assistantContent) {
        saveMessage("assistant", assistantContent);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "I\u2019m sorry, I\u2019m having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  if (loadingHistory) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4a7c6b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-warm">
      {/* Header */}
      <header className="shrink-0 bg-white/60 backdrop-blur-md border-b border-[#e8e4df]/60 px-6 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4a7c6b] to-[#2d4e43] flex items-center justify-center shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#68b89e] border-2 border-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-[#1a1008] tracking-tight">RelAI</h1>
              <p className="text-[11px] text-[#8a7a66]">Your relationship coach</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowCrisis(true)}
              className="text-xs text-[#c45c5c]/70 hover:text-[#c45c5c] transition-colors"
            >
              I need help now
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-[#8a7a66] hover:text-[#1a1008] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 chat-scroll">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && <EmptyState onSelect={handleSend} name={userName} />}
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start mb-4 msg-enter">
              <div className="bg-white/80 backdrop-blur-sm border border-[#e8e4df] rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-[#4a7c6b] rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-[#4a7c6b] rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-[#4a7c6b] rounded-full typing-dot" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 bg-white/60 backdrop-blur-md border-t border-[#e8e4df]/60 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
          <p className="text-[10px] text-[#c4bbaf] text-center mt-2.5 tracking-wide">
            Not a replacement for professional therapy &middot; If in crisis, contact a mental health professional
          </p>
        </div>
      </div>

      {/* Crisis Resources Modal */}
      {showCrisis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCrisis(false)}
            onKeyDown={(e) => { if (e.key === "Escape") setShowCrisis(false); }}
            role="button"
            tabIndex={0}
            aria-label="Close crisis resources"
          />
          <div className="relative glass-card p-8 max-w-md w-full msg-enter">
            <h2 className="font-heading text-xl font-semibold text-[#1a1008] mb-2">
              You are not alone.
            </h2>
            <p className="text-sm text-[#8a7a66] mb-6">
              If you or someone you know is in danger, please reach out to these resources.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl bg-white/80 border border-[#e8e4df] p-4">
                <p className="text-xs font-medium tracking-wide uppercase text-[#c45c5c] mb-1">
                  National Domestic Violence Hotline
                </p>
                <a href="tel:18007997233" className="text-base font-semibold text-[#1a1008] hover:text-[#4a7c6b] transition-colors">
                  1-800-799-7233
                </a>
              </div>

              <div className="rounded-xl bg-white/80 border border-[#e8e4df] p-4">
                <p className="text-xs font-medium tracking-wide uppercase text-[#c45c5c] mb-1">
                  Crisis Text Line
                </p>
                <p className="text-base font-semibold text-[#1a1008]">
                  Text <span className="text-[#4a7c6b]">HOME</span> to <span className="text-[#4a7c6b]">741741</span>
                </p>
              </div>

              <div className="rounded-xl bg-white/80 border border-[#e8e4df] p-4">
                <p className="text-xs font-medium tracking-wide uppercase text-[#c45c5c] mb-1">
                  988 Suicide & Crisis Lifeline
                </p>
                <a href="tel:988" className="text-base font-semibold text-[#1a1008] hover:text-[#4a7c6b] transition-colors">
                  Call or text <span className="text-[#4a7c6b]">988</span>
                </a>
              </div>

              <div className="rounded-xl bg-white/80 border border-[#e8e4df] p-4">
                <p className="text-xs font-medium tracking-wide uppercase text-[#8a7a66] mb-1">
                  International
                </p>
                <p className="text-sm text-[#2d2418]">
                  Contact your local emergency services or visit{" "}
                  <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="text-[#4a7c6b] underline underline-offset-2">
                    findahelpline.com
                  </a>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCrisis(false)}
              className="mt-6 w-full rounded-xl border border-[#e8e4df] bg-white/50 px-5 py-3 text-sm text-[#8a7a66] hover:text-[#1a1008] hover:bg-white transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STARTERS = [
  {
    emoji: "\uD83D\uDD01",
    label: "We keep having the same fight",
    prompt: "My partner and I keep having the same argument and I don't know how to break the cycle. Can you help me see what's really going on underneath?",
  },
  {
    emoji: "\uD83E\uDDE9",
    label: "Explain my archetype to me",
    prompt: "Can you walk me through my relationship archetype? I want to understand what it means for how I show up in relationships.",
  },
  {
    emoji: "\uD83D\uDCAC",
    label: "I need to have a hard conversation",
    prompt: "There's something I need to tell my partner but I don't know how to say it without it turning into a fight. Can you help me find the words?",
  },
  {
    emoji: "\u2764\uFE0F",
    label: "Feeling disconnected",
    prompt: "I feel like my partner and I are drifting apart. We're not fighting — we're just... not connecting anymore. What do I do?",
  },
];

function EmptyState({ onSelect, name }: { onSelect: (msg: string) => void; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
      {/* Logo */}
      <div className="relative mb-8">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4a7c6b] to-[#2d4e43] flex items-center justify-center avatar-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Welcome text */}
      <h2 className="text-2xl sm:text-3xl font-semibold text-[#1a1008] mb-3 tracking-tight">
        {name ? `Hey ${name}, I\u2019m RelAI.` : "Hey, I\u2019m RelAI."}
      </h2>
      <p className="text-[#8a7a66] max-w-md leading-relaxed mb-10 text-[15px]">
        {name
          ? "I\u2019ve read your profile. I know your patterns, your style, what you need. Let\u2019s talk about what\u2019s on your mind."
          : "I\u2019m here to help you understand your relationship patterns, navigate tough conversations, and build stronger connections."}
      </p>

      {/* Starter prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {STARTERS.map(({ emoji, label, prompt }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(prompt)}
            className="starter-prompt flex items-center gap-3 text-left bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-xl px-4 py-3.5 hover:bg-white hover:border-[#d4cfc7] group"
          >
            <span className="text-lg shrink-0">{emoji}</span>
            <span className="text-sm text-[#4a3d2e] font-medium group-hover:text-[#1a1008] transition-colors">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
