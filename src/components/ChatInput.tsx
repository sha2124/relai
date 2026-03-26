"use client";

import { useState, useRef, useEffect } from "react";
import { VoiceRecorder } from "./VoiceRecorder";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleTranscript(text: string) {
    setInput((prev) => (prev ? prev + " " + text : text));
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-2xl border border-[#e2dcd1] bg-white px-4 py-3 pr-24 text-[15px] text-[#312e29] placeholder:text-[#b1ada5] focus:outline-none focus:ring-2 focus:ring-[#8d4837]/20 focus:border-[#8d4837]/40 disabled:opacity-50 transition-all shadow-sm"
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
          <VoiceRecorder onTranscript={handleTranscript} disabled={disabled} />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#8d4837] to-[#6d2e20] flex items-center justify-center text-white hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22l-4-9-9-4L22 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
