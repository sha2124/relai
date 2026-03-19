"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 msg-enter`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="shrink-0 mr-3 mt-1">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4a7c6b] to-[#2d4e43] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-[#3a6355] to-[#2d4e43] text-white rounded-br-sm"
            : "bg-white/80 backdrop-blur-sm border border-[#e8e4df] text-[#2d2418] rounded-bl-sm"
        }`}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
