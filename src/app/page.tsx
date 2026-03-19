"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chat } from "@/components/Chat";

export default function Home() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const profile = localStorage.getItem("relai-profile");
    if (profile) {
      setHasProfile(true);
    } else {
      setHasProfile(false);
    }
  }, []);

  // Loading state
  if (hasProfile === null) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4a7c6b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No profile yet — show landing
  if (!hasProfile) {
    return <Landing onStart={() => router.push("/quiz")} />;
  }

  // Has profile — show chat
  return <Chat />;
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-gradient-warm flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          {/* Logo */}
          <div className="relative inline-block mb-8">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4a7c6b] to-[#2d4e43] flex items-center justify-center avatar-glow mx-auto">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white"
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-[#1a1008] mb-4 tracking-tight leading-tight">
            Understand your
            <br />
            relationship patterns.
          </h1>

          <p className="text-[#8a7a66] text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            RelAI is a practice space for your relationships — understand your
            patterns, find the words, then go have the real conversation.
          </p>

          <button
            type="button"
            onClick={onStart}
            className="inline-block rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-10 py-4 text-white font-semibold text-lg hover:shadow-lg transition-all"
          >
            Take the free quiz
          </button>

          <p className="text-xs text-[#c4bbaf] mt-4">
            5 minutes &middot; No sign-up required
          </p>

          {/* Value props */}
          <div className="mt-16 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl mb-1">{"\uD83D\uDD17"}</p>
              <p className="text-xs text-[#8a7a66] leading-snug">
                Your attachment
                <br />
                style
              </p>
            </div>
            <div>
              <p className="text-2xl mb-1">{"\uD83D\uDCAC"}</p>
              <p className="text-xs text-[#8a7a66] leading-snug">
                How you
                <br />
                communicate
              </p>
            </div>
            <div>
              <p className="text-2xl mb-1">{"\u2764\uFE0F"}</p>
              <p className="text-xs text-[#8a7a66] leading-snug">
                What you
                <br />
                need in love
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-6 text-center">
        <p className="text-[10px] text-[#c4bbaf] tracking-wide">
          Not a replacement for professional therapy &middot; A practice space
          for your relationships
        </p>
      </div>
    </div>
  );
}
