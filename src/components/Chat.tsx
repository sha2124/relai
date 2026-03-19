"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { createClient } from "@/lib/supabase/client";

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
        setUserProfile(
          `Name: ${profile.name}\n` +
          `Relationship status: ${profile.relationship_status}\n` +
          `Attachment style: ${profile.attachment_style?.label} — ${profile.attachment_style?.description}\n` +
          `Communication style: ${profile.communication_style?.label} — ${profile.communication_style?.description}\n` +
          `Conflict response: ${profile.conflict_response?.label} — ${profile.conflict_response?.description}\n` +
          `Love language (needs): ${profile.love_language?.receivingLabel}\n` +
          `Love language (gives): ${profile.love_language?.givingLabel}\n` +
          `Goal: ${profile.goal_label}`
        );
      } else {
        // Fall back to localStorage
        const saved = localStorage.getItem("relai-profile");
        if (saved) {
          try {
            const p = JSON.parse(saved);
            setUserName(p.name ?? "");
            setUserProfile(
              `Name: ${p.name}\n` +
              `Relationship status: ${p.relationshipStatus}\n` +
              `Attachment style: ${p.attachmentStyle?.label} — ${p.attachmentStyle?.description}\n` +
              `Communication style: ${p.communicationStyle?.label} — ${p.communicationStyle?.description}\n` +
              `Conflict response: ${p.conflictResponse?.label} — ${p.conflictResponse?.description}\n` +
              `Love language (needs): ${p.loveLanguage?.receivingLabel}\n` +
              `Love language (gives): ${p.loveLanguage?.givingLabel}\n` +
              `Goal: ${p.goalLabel}`
            );
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
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-[#8a7a66] hover:text-[#1a1008] transition-colors"
          >
            Sign out
          </button>
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
    </div>
  );
}

const STARTERS = [
  {
    emoji: "\uD83D\uDD01",
    label: "Same argument on repeat",
    prompt: "My partner and I keep having the same argument and I don't know how to break the cycle",
  },
  {
    emoji: "\uD83E\uDDE9",
    label: "Understand my patterns",
    prompt: "I want to understand my attachment style and how it affects my relationships",
  },
  {
    emoji: "\uD83D\uDEE1\uFE0F",
    label: "Setting boundaries",
    prompt: "How do I set boundaries with my family without feeling guilty?",
  },
  {
    emoji: "\uD83D\uDCAC",
    label: "Better communication",
    prompt: "I struggle to express what I need without starting a fight",
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
