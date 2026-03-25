"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NudgeBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { count } = await supabase
        .from("nudges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("is_dismissed", false);

      setUnreadCount(count ?? 0);
    }

    fetchUnread();

    // Refresh count every 60 seconds
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/nudges"
      className="relative p-2 rounded-lg hover:bg-[#8d4837]/[0.06] transition-colors"
      title="Nudges"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5c5650"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={unreadCount > 0 ? "animate-[bellPulse_2s_ease-in-out_infinite]" : ""}
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#8d4837] text-white text-[10px] font-bold leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      <style jsx>{`
        @keyframes bellPulse {
          0%, 100% {
            transform: rotate(0deg);
          }
          10% {
            transform: rotate(8deg);
          }
          20% {
            transform: rotate(-8deg);
          }
          30% {
            transform: rotate(4deg);
          }
          40% {
            transform: rotate(-4deg);
          }
          50% {
            transform: rotate(0deg);
          }
        }
      `}</style>
    </Link>
  );
}
