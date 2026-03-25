"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SafetyBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed this session
    if (sessionStorage.getItem("relai-safety-banner-dismissed")) return;

    async function checkAlerts() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: urgentAlerts } = await supabase
          .from("safety_alerts")
          .select("id")
          .eq("user_id", user.id)
          .in("severity", ["urgent", "critical"])
          .eq("is_acknowledged", false)
          .gte("created_at", sevenDaysAgo.toISOString())
          .limit(1);

        if (urgentAlerts && urgentAlerts.length > 0) {
          setVisible(true);
        }
      } catch {
        // Fail silently — don't disrupt the user experience
      }
    }

    checkAlerts();
  }, []);

  function dismiss() {
    sessionStorage.setItem("relai-safety-banner-dismissed", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-[#fcf6ed] border-b border-[#e2dcd1] px-4 py-3 msg-enter">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/safety")}
          className="flex-1 text-left text-sm text-[#312e29] leading-snug"
        >
          <span className="font-medium">We noticed something in your conversations that might be worth looking at.</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => router.push("/safety")}
            className="text-xs font-medium text-[#8d4837] hover:underline whitespace-nowrap"
          >
            View
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="p-1 text-[#b1ada5] hover:text-[#7a766f] transition-colors"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
