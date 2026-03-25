"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype } from "@/lib/quiz/archetypes";

interface MediationMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: "partner1" | "partner2" | "mediator";
  content: string;
  created_at: string;
}

interface MediationSession {
  id: string;
  user1_id: string;
  user2_id: string;
  status: "active" | "paused" | "completed";
  topic: string | null;
  summary: string | null;
  created_at: string;
  ended_at: string | null;
}

interface ProfileData {
  user_id: string;
  name: string;
  attachment_style: { primary?: string; label?: string; description?: string };
  communication_style: { primary?: string; label?: string; description?: string };
  conflict_response: { primary?: string; label?: string; description?: string };
  love_language: { receivingLabel?: string; givingLabel?: string };
  goal_label?: string;
}

function buildProfileContext(p: ProfileData) {
  const archetype =
    p.attachment_style?.primary && p.communication_style?.primary && p.conflict_response?.primary
      ? getArchetype(p.attachment_style.primary, p.communication_style.primary, p.conflict_response.primary)
      : null;

  let ctx = `Name: ${p.name}\n`;
  if (archetype) {
    ctx += `Archetype: "${archetype.name}" — ${archetype.tagline}\n`;
    ctx += `Strengths: ${archetype.strengths.join(", ")}\n`;
    ctx += `Blind spots: ${archetype.blindSpots.join(", ")}\n`;
    ctx += `Growth edge: ${archetype.growthEdge}\n`;
  }
  ctx += `Attachment: ${p.attachment_style?.label ?? "unknown"}\n`;
  ctx += `Communication: ${p.communication_style?.label ?? "unknown"}\n`;
  ctx += `Conflict style: ${p.conflict_response?.label ?? "unknown"}\n`;
  return ctx;
}

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/^[-•]\s+(.+)/gm, '<span class="flex gap-2"><span class="shrink-0">•</span><span>$1</span></span>')
    .replace(/^(\d+)\.\s+(.+)/gm, '<span class="flex gap-2"><span class="shrink-0 font-medium">$1.</span><span>$2</span></span>');
}

export default function MediatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileData | null>(null);
  const [hasPartner, setHasPartner] = useState(false);

  // Session state
  const [activeSession, setActiveSession] = useState<MediationSession | null>(null);
  const [pastSessions, setPastSessions] = useState<MediationSession[]>([]);
  const [messages, setMessages] = useState<MediationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMediating, setIsMediating] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [viewingSummary, setViewingSummary] = useState<MediationSession | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageCountRef = useRef(0);

  // Determine sender role
  const myRole = useMemo(() => {
    if (!activeSession || !userId) return "partner1";
    return userId === activeSession.user1_id ? "partner1" : "partner2";
  }, [activeSession, userId]);

  // Get name for a sender
  const getNameForRole = useCallback(
    (role: string) => {
      if (role === "mediator") return "RelAI Mediator";
      if (role === "partner1") {
        if (activeSession?.user1_id === userId) return myProfile?.name ?? "You";
        return partnerProfile?.name ?? "Partner";
      }
      if (role === "partner2") {
        if (activeSession?.user2_id === userId) return myProfile?.name ?? "You";
        return partnerProfile?.name ?? "Partner";
      }
      return "Unknown";
    },
    [activeSession, userId, myProfile, partnerProfile],
  );

  const getInitialForRole = useCallback(
    (role: string, senderId: string | null) => {
      if (role === "mediator") return "\uD83D\uDD4A\uFE0F";
      if (senderId === userId) {
        return myProfile?.name?.[0]?.toUpperCase() ?? "?";
      }
      return partnerProfile?.name?.[0]?.toUpperCase() ?? "?";
    },
    [userId, myProfile, partnerProfile],
  );

  const isMyMessage = useCallback(
    (msg: MediationMessage) => msg.sender_id === userId,
    [userId],
  );

  // Load initial data
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/mediate");
        return;
      }

      setUserId(user.id);

      // Load my profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name, attachment_style, communication_style, conflict_response, love_language, goal_label")
        .eq("user_id", user.id)
        .single();

      if (profile) setMyProfile(profile as ProfileData);

      // Check for linked partner
      const { data: link } = await supabase
        .from("partner_links")
        .select("partner_id")
        .eq("user_id", user.id)
        .eq("status", "linked")
        .single();

      if (link?.partner_id) {
        setHasPartner(true);
        setPartnerId(link.partner_id);

        // Load partner profile
        const { data: pProfile } = await supabase
          .from("profiles")
          .select("user_id, name, attachment_style, communication_style, conflict_response, love_language, goal_label")
          .eq("user_id", link.partner_id)
          .single();

        if (pProfile) setPartnerProfile(pProfile as ProfileData);

        // Load active session (where I'm either user1 or user2)
        const { data: active } = await supabase
          .from("mediation_sessions")
          .select("*")
          .eq("status", "active")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (active) {
          setActiveSession(active as MediationSession);

          // Load messages for active session
          const { data: msgs } = await supabase
            .from("mediation_messages")
            .select("*")
            .eq("session_id", active.id)
            .order("created_at", { ascending: true });

          if (msgs) {
            setMessages(msgs as MediationMessage[]);
            lastMessageCountRef.current = msgs.length;
          }
        }

        // Load past sessions
        const { data: past } = await supabase
          .from("mediation_sessions")
          .select("*")
          .eq("status", "completed")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(10);

        if (past) setPastSessions(past as MediationSession[]);
      } else {
        // Also check if partner linked me (reverse lookup)
        const { data: reverseLink } = await supabase
          .from("partner_links")
          .select("user_id")
          .eq("partner_id", user.id)
          .eq("status", "linked")
          .single();

        if (reverseLink?.user_id) {
          setHasPartner(true);
          setPartnerId(reverseLink.user_id);

          const { data: pProfile } = await supabase
            .from("profiles")
            .select("user_id, name, attachment_style, communication_style, conflict_response, love_language, goal_label")
            .eq("user_id", reverseLink.user_id)
            .single();

          if (pProfile) setPartnerProfile(pProfile as ProfileData);

          // Load active session
          const { data: active } = await supabase
            .from("mediation_sessions")
            .select("*")
            .eq("status", "active")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (active) {
            setActiveSession(active as MediationSession);

            const { data: msgs } = await supabase
              .from("mediation_messages")
              .select("*")
              .eq("session_id", active.id)
              .order("created_at", { ascending: true });

            if (msgs) {
              setMessages(msgs as MediationMessage[]);
              lastMessageCountRef.current = msgs.length;
            }
          }

          // Load past sessions
          const { data: past } = await supabase
            .from("mediation_sessions")
            .select("*")
            .eq("status", "completed")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .order("created_at", { ascending: false })
            .limit(10);

          if (past) setPastSessions(past as MediationSession[]);
        }
      }

      setLoading(false);
    }

    load();
  }, [router]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMediating]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Poll for new messages from partner
  useEffect(() => {
    if (!activeSession) return;

    pollRef.current = setInterval(async () => {
      const supabase = createClient();
      const { data: msgs } = await supabase
        .from("mediation_messages")
        .select("*")
        .eq("session_id", activeSession.id)
        .order("created_at", { ascending: true });

      if (msgs && msgs.length > lastMessageCountRef.current) {
        setMessages(msgs as MediationMessage[]);

        // Check if the new messages are from partner (for typing indicator)
        const newMsgs = msgs.slice(lastMessageCountRef.current);
        const hasPartnerMsg = newMsgs.some((m: MediationMessage) => m.sender_id !== userId && m.sender_role !== "mediator");
        if (hasPartnerMsg) {
          setPartnerTyping(false);
        }

        lastMessageCountRef.current = msgs.length;
      }

      // Also check if session was ended by partner
      const { data: session } = await supabase
        .from("mediation_sessions")
        .select("status, summary, ended_at")
        .eq("id", activeSession.id)
        .single();

      if (session && session.status === "completed") {
        setActiveSession((prev) =>
          prev ? { ...prev, status: "completed", summary: session.summary, ended_at: session.ended_at } : null,
        );
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeSession, userId]);

  // Start a new session
  async function handleStartSession() {
    if (!userId || !partnerId || !topicInput.trim()) return;

    const supabase = createClient();
    const { data: session, error } = await supabase
      .from("mediation_sessions")
      .insert({
        user1_id: userId,
        user2_id: partnerId,
        topic: topicInput.trim(),
        status: "active",
      })
      .select()
      .single();

    if (error || !session) {
      console.error("Failed to create session:", error);
      return;
    }

    setActiveSession(session as MediationSession);
    setMessages([]);
    lastMessageCountRef.current = 0;
    setShowTopicModal(false);
    setTopicInput("");

    // Trigger mediator opening
    await triggerMediator(session as MediationSession, []);
  }

  // Send a message
  async function handleSend() {
    if (!input.trim() || !activeSession || !userId || isSending) return;

    const content = input.trim();
    setInput("");
    setIsSending(true);

    const supabase = createClient();
    const { data: newMsg, error } = await supabase
      .from("mediation_messages")
      .insert({
        session_id: activeSession.id,
        sender_id: userId,
        sender_role: myRole,
        content,
      })
      .select()
      .single();

    if (error || !newMsg) {
      console.error("Failed to send message:", error);
      setIsSending(false);
      return;
    }

    const updatedMessages = [...messages, newMsg as MediationMessage];
    setMessages(updatedMessages);
    lastMessageCountRef.current = updatedMessages.length;
    setIsSending(false);

    // Trigger mediator after user sends a message
    // The AI decides whether to intervene
    await triggerMediator(activeSession, updatedMessages);
  }

  // Trigger the mediator AI
  async function triggerMediator(session: MediationSession, currentMessages: MediationMessage[]) {
    setIsMediating(true);

    // Build conversation for the AI
    const apiMessages = currentMessages.map((m) => {
      const name = getNameForRole(m.sender_role);
      if (m.sender_role === "mediator") {
        return { role: "assistant" as const, content: m.content };
      }
      return { role: "user" as const, content: `[${name}]: ${m.content}` };
    });

    // If no messages yet, this is the opening
    if (apiMessages.length === 0) {
      apiMessages.push({
        role: "user" as const,
        content: `[System]: A new mediation session is starting. The topic is: "${session.topic}". Partner 1 is ${myProfile?.name ?? "Partner 1"} and Partner 2 is ${partnerProfile?.name ?? "Partner 2"}. Please open the session with your introduction and ground rules.`,
      });
    }

    try {
      const res = await fetch("/api/mediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          user1Profile: myProfile ? buildProfileContext(myProfile) : undefined,
          user2Profile: partnerProfile ? buildProfileContext(partnerProfile) : undefined,
          topic: session.topic,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get mediator response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

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
                fullContent += data.text;
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }

      if (fullContent) {
        // Save mediator message to Supabase
        const supabase = createClient();
        const { data: mediatorMsg } = await supabase
          .from("mediation_messages")
          .insert({
            session_id: session.id,
            sender_id: null,
            sender_role: "mediator",
            content: fullContent,
          })
          .select()
          .single();

        if (mediatorMsg) {
          const updated = [...currentMessages, mediatorMsg as MediationMessage];
          setMessages(updated);
          lastMessageCountRef.current = updated.length;
        }
      }
    } catch (err) {
      console.error("Mediator error:", err);
    } finally {
      setIsMediating(false);
    }
  }

  // End session
  async function handleEndSession() {
    if (!activeSession) return;
    setIsEnding(true);

    // Generate summary
    const apiMessages = messages.map((m) => {
      const name = getNameForRole(m.sender_role);
      if (m.sender_role === "mediator") {
        return { role: "assistant" as const, content: m.content };
      }
      return { role: "user" as const, content: `[${name}]: ${m.content}` };
    });

    let summary = "";
    try {
      const res = await fetch("/api/mediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          topic: activeSession.topic,
          mode: "summary",
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) summary += data.text;
              } catch {
                // skip
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Summary generation error:", err);
      summary = "Session completed. Summary could not be generated.";
    }

    // Update session in Supabase
    const supabase = createClient();
    await supabase
      .from("mediation_sessions")
      .update({
        status: "completed",
        summary,
        ended_at: new Date().toISOString(),
      })
      .eq("id", activeSession.id);

    const completedSession = {
      ...activeSession,
      status: "completed" as const,
      summary,
      ended_at: new Date().toISOString(),
    };

    setActiveSession(null);
    setMessages([]);
    setShowEndConfirm(false);
    setIsEnding(false);
    setViewingSummary(completedSession);
    setPastSessions((prev) => [completedSession, ...prev]);

    if (pollRef.current) clearInterval(pollRef.current);
  }

  // Handle Enter key
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Active session — completed by partner
  if (activeSession?.status === "completed") {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm">
        <div className="px-6 pt-12 pb-8">
          <div className="max-w-lg mx-auto stagger-in">
            <button
              type="button"
              onClick={() => {
                setViewingSummary(activeSession);
                setActiveSession(null);
                setMessages([]);
              }}
              className="text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors mb-8 flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Session ended
            </button>

            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
              Session Completed
            </h1>
            <p className="text-[#7a766f] text-base leading-relaxed mb-6">
              Your partner ended this session.
            </p>

            {activeSession.summary && (
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium tracking-wide uppercase text-[#705900] mb-3">Session Summary</p>
                <div className="text-sm text-[#312e29] leading-relaxed whitespace-pre-wrap">
                  {activeSession.summary}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active session view
  if (activeSession) {
    return (
      <div className="flex flex-col h-[100dvh] bg-gradient-warm">
        {/* Header */}
        <header className="shrink-0 glass-white border-b border-[#e2dcd1]/60 px-6 py-3.5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#705900] to-[#8d6e00] flex items-center justify-center shadow-sm">
                <span className="text-white text-lg">{"\uD83D\uDD4A\uFE0F"}</span>
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-[#312e29] tracking-tight">Mediated Session</h1>
                <p className="text-[11px] text-[#7a766f]">
                  {activeSession.topic ? activeSession.topic : "Session in progress"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-[#68b89e] font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#68b89e] inline-block" />
                Active
              </span>
              <button
                type="button"
                onClick={() => setShowEndConfirm(true)}
                className="text-xs text-[#7a766f] hover:text-[#b41340] transition-colors px-3 py-1.5 rounded-lg border border-[#e2dcd1] hover:border-[#b41340]/30"
              >
                End session
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 premium-scroll">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && !isMediating && (
              <div className="text-center py-16">
                <p className="text-[#b1ada5] text-sm">Starting your session...</p>
              </div>
            )}

            {messages.map((msg) => {
              const isMine = isMyMessage(msg);
              const isMediator = msg.sender_role === "mediator";
              const senderName = isMine ? "You" : getNameForRole(msg.sender_role);
              const initial = getInitialForRole(msg.sender_role, msg.sender_id);
              const formatted = parseMarkdown(msg.content);

              if (isMediator) {
                return (
                  <div key={msg.id} className="flex justify-start mb-4 msg-enter">
                    <div className="shrink-0 mr-3 mt-1">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#705900] to-[#8d6e00] flex items-center justify-center">
                        <span className="text-xs">{initial}</span>
                      </div>
                    </div>
                    <div className="max-w-[80%]">
                      <p className="text-[10px] uppercase tracking-wider text-[#705900] mb-1 font-medium">
                        {senderName}
                      </p>
                      <div className="bg-white/90 backdrop-blur-sm border border-[#705900]/20 rounded-2xl rounded-bl-sm px-4 py-3 text-[15px] leading-relaxed shadow-sm text-[#312e29]">
                        <div
                          className="whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic"
                          dangerouslySetInnerHTML={{ __html: formatted }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              if (isMine) {
                return (
                  <div key={msg.id} className="flex justify-end mb-4 msg-enter">
                    <div className="max-w-[75%]">
                      <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mb-1 text-right font-medium">
                        You
                      </p>
                      <div className="bg-gradient-to-br from-[#3a6355] to-[#6d2e20] text-white rounded-2xl rounded-br-sm px-4 py-3 text-[15px] leading-relaxed shadow-sm">
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-3 mt-5">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#8d4837] to-[#6d2e20] flex items-center justify-center text-white text-xs font-medium">
                        {initial}
                      </div>
                    </div>
                  </div>
                );
              }

              // Partner message
              return (
                <div key={msg.id} className="flex justify-start mb-4 msg-enter">
                  <div className="shrink-0 mr-3 mt-5">
                    <div className="h-7 w-7 rounded-full bg-[#dbeafe] border border-[#93c5fd] flex items-center justify-center text-[#1e40af] text-xs font-medium">
                      {initial}
                    </div>
                  </div>
                  <div className="max-w-[75%]">
                    <p className="text-[10px] uppercase tracking-wider text-[#7a766f] mb-1 font-medium">
                      {senderName}
                    </p>
                    <div className="bg-[#dbeafe]/60 backdrop-blur-sm border border-[#93c5fd]/40 rounded-2xl rounded-bl-sm px-4 py-3 text-[15px] leading-relaxed shadow-sm text-[#312e29]">
                      <div
                        className="whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: formatted }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mediator typing indicator */}
            {isMediating && (
              <div className="flex justify-start mb-4 msg-enter">
                <div className="shrink-0 mr-3 mt-1">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#705900] to-[#8d6e00] flex items-center justify-center">
                    <span className="text-xs">{"\uD83D\uDD4A\uFE0F"}</span>
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm border border-[#705900]/20 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-[#705900] rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-[#705900] rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-[#705900] rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}

            {/* Partner typing indicator */}
            {partnerTyping && (
              <div className="flex justify-start mb-4 msg-enter">
                <div className="shrink-0 mr-3 mt-1">
                  <div className="h-7 w-7 rounded-full bg-[#dbeafe] border border-[#93c5fd] flex items-center justify-center text-[#1e40af] text-xs font-medium">
                    {partnerProfile?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                </div>
                <div className="bg-[#dbeafe]/60 backdrop-blur-sm border border-[#93c5fd]/40 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#1e40af]/40 rounded-full typing-dot" />
                      <span className="w-1.5 h-1.5 bg-[#1e40af]/40 rounded-full typing-dot" />
                      <span className="w-1.5 h-1.5 bg-[#1e40af]/40 rounded-full typing-dot" />
                    </div>
                    <span className="text-[11px] text-[#93c5fd] italic">{partnerProfile?.name ?? "Partner"} is typing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 bg-white/60 backdrop-blur-md border-t border-[#e2dcd1]/60 px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your thoughts..."
                  disabled={isSending || isMediating}
                  rows={1}
                  className="w-full resize-none rounded-2xl border border-[#e2dcd1] bg-white px-4 py-3 pr-12 text-[15px] text-[#312e29] placeholder:text-[#b1ada5] focus:outline-none focus:ring-2 focus:ring-[#705900]/20 focus:border-[#705900]/40 disabled:opacity-50 transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isSending || isMediating || !input.trim()}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-xl bg-gradient-to-br from-[#705900] to-[#8d6e00] flex items-center justify-center text-white hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2L15 22l-4-9-9-4L22 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </form>
            <p className="text-[10px] text-[#b1ada5] text-center mt-2.5 tracking-wide">
              Your mediator will guide the conversation &middot; Be honest and open
            </p>
          </div>
        </div>

        {/* End session confirmation */}
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isEnding && setShowEndConfirm(false)}
              onKeyDown={(e) => { if (e.key === "Escape" && !isEnding) setShowEndConfirm(false); }}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="relative bg-white/95 backdrop-blur-md border border-[#e2dcd1] rounded-2xl p-6 max-w-sm w-full shadow-xl msg-enter">
              <h2 className="font-heading text-xl font-semibold text-[#312e29] mb-2">End this session?</h2>
              <p className="text-sm text-[#7a766f] mb-6">
                The mediator will generate a summary of your conversation. You can always start a new session later.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(false)}
                  disabled={isEnding}
                  className="flex-1 rounded-xl border border-[#e2dcd1] bg-white/50 px-4 py-2.5 text-sm text-[#7a766f] hover:text-[#312e29] hover:bg-white transition-all disabled:opacity-50"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleEndSession}
                  disabled={isEnding}
                  className="flex-1 rounded-xl bg-gradient-to-br from-[#8d4837] to-[#6d2e20] px-4 py-2.5 text-sm text-white hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEnding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ending...
                    </>
                  ) : (
                    "End session"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Viewing a summary
  if (viewingSummary) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm">
        <div className="px-6 pt-12 pb-8">
          <div className="max-w-lg mx-auto stagger-in">
            <button
              type="button"
              onClick={() => setViewingSummary(null)}
              className="text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors mb-8 flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Back to sessions
            </button>

            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
              Session Summary
            </h1>
            <p className="text-[#7a766f] text-sm mb-2">
              {viewingSummary.topic && (
                <span className="font-medium text-[#312e29]">{viewingSummary.topic}</span>
              )}
            </p>
            <p className="text-[#b1ada5] text-xs mb-8">
              {new Date(viewingSummary.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            {viewingSummary.summary ? (
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">{"\uD83D\uDD4A\uFE0F"}</span>
                  <p className="text-xs font-medium tracking-wide uppercase text-[#705900]">
                    Mediator&apos;s Summary
                  </p>
                </div>
                <div
                  className="text-sm text-[#312e29] leading-relaxed whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(viewingSummary.summary) }}
                />
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
                <p className="text-sm text-[#7a766f] italic">No summary available for this session.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewingSummary(null)}
              className="w-full rounded-xl bg-gradient-to-br from-[#8d4837] to-[#6d2e20] px-5 py-3 text-sm text-white hover:shadow-md transition-all"
            >
              Back to sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-session state (no active session)
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
            Back to chat
          </button>

          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
            Mediated Session
          </h1>
          <p className="text-[#7a766f] text-base leading-relaxed mb-8">
            A guided conversation with your partner. I&apos;ll make sure you both feel heard and help you find common ground.
          </p>

          {/* Explanation card */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-[#705900]/10 to-[#705900]/20 border border-[#705900]/20 flex items-center justify-center">
                <span className="text-2xl">{"\uD83D\uDD4A\uFE0F"}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#312e29] mb-1">How it works</p>
                <ul className="text-sm text-[#7a766f] space-y-1.5">
                  <li className="flex gap-2">
                    <span className="shrink-0 text-[#705900]">1.</span>
                    <span>Choose a topic to work through together</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 text-[#705900]">2.</span>
                    <span>Both you and your partner join the conversation</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 text-[#705900]">3.</span>
                    <span>The AI mediator guides you, ensures fairness, and helps you find solutions</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 text-[#705900]">4.</span>
                    <span>End with a summary and agreed next steps</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {!hasPartner ? (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-sm text-[#312e29] font-medium mb-2">Partner required</p>
              <p className="text-sm text-[#7a766f] mb-4">
                You need a linked partner to start a mediated session. Invite your partner to join RelAI first.
              </p>
              <button
                type="button"
                onClick={() => router.push("/partner")}
                className="rounded-xl bg-gradient-to-br from-[#8d4837] to-[#6d2e20] px-5 py-2.5 text-sm text-white hover:shadow-md transition-all"
              >
                Go to Partner page
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTopicModal(true)}
              className="w-full rounded-xl bg-gradient-to-br from-[#705900] to-[#8d6e00] px-5 py-3.5 text-white font-medium hover:shadow-md transition-all mb-6 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Start a session
            </button>
          )}

          {/* Past sessions */}
          {pastSessions.length > 0 && (
            <div>
              <p className="text-xs font-medium tracking-wide uppercase text-[#8d4837] mb-4">
                Past sessions
              </p>
              <div className="space-y-3">
                {pastSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setViewingSummary(session)}
                    className="w-full text-left bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-4 shadow-sm hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#312e29]">
                          {session.topic || "Untitled session"}
                        </p>
                        <p className="text-xs text-[#7a766f] mt-1">
                          {new Date(session.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#68b89e] bg-[#68b89e]/10 px-2 py-1 rounded-full font-medium">
                        Completed
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Topic input modal */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowTopicModal(false)}
            onKeyDown={(e) => { if (e.key === "Escape") setShowTopicModal(false); }}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="relative bg-white/95 backdrop-blur-md border border-[#e2dcd1] rounded-2xl p-6 max-w-sm w-full shadow-xl msg-enter">
            <h2 className="font-heading text-xl font-semibold text-[#312e29] mb-2">
              Start a session
            </h2>
            <p className="text-sm text-[#7a766f] mb-4">
              What would you like to work through together?
            </p>
            <textarea
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="e.g., We keep disagreeing about household responsibilities..."
              rows={3}
              className="w-full resize-none rounded-xl border border-[#e2dcd1] bg-white px-4 py-3 text-[15px] text-[#312e29] placeholder:text-[#b1ada5] focus:outline-none focus:ring-2 focus:ring-[#705900]/20 focus:border-[#705900]/40 transition-all shadow-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="flex-1 rounded-xl border border-[#e2dcd1] bg-white/50 px-4 py-2.5 text-sm text-[#7a766f] hover:text-[#312e29] hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                disabled={!topicInput.trim()}
                className="flex-1 rounded-xl bg-gradient-to-br from-[#705900] to-[#8d6e00] px-4 py-2.5 text-sm text-white hover:shadow-md transition-all disabled:opacity-50"
              >
                Begin
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="px-6 py-6 text-center border-t border-[#e2dcd1]/60">
        <p className="text-[10px] text-[#b1ada5] tracking-wide">
          The mediator ensures fairness &middot; Not a replacement for professional counseling
        </p>
      </footer>
    </div>
  );
}
