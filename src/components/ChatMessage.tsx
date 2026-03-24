"use client";

import { useMemo } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

function parseMarkdown(text: string): string {
  return text
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic: *text* (but not inside bold)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Bullet points: - text or • text at start of line
    .replace(/^[-•]\s+(.+)/gm, '<span class="flex gap-2"><span class="shrink-0">•</span><span>$1</span></span>')
    // Numbered lists: 1. text
    .replace(/^(\d+)\.\s+(.+)/gm, '<span class="flex gap-2"><span class="shrink-0 font-medium">$1.</span><span>$2</span></span>');
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  const formattedContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 msg-enter`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="shrink-0 mr-3 mt-1">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#8d4837] to-[#6d2e20] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-[#3a6355] to-[#6d2e20] text-white rounded-br-sm"
            : "bg-white/80 backdrop-blur-sm border border-[#e2dcd1] text-[#312e29] rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div
            className="whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        )}
      </div>
    </div>
  );
}
