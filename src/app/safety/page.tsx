"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AlertResource {
  primary?: { name: string; contact: string };
  text?: { name: string; contact: string };
  guidance?: string;
}

interface SafetyAlert {
  id?: string;
  severity: "watch" | "concern" | "urgent" | "critical";
  category: "abuse" | "self_harm" | "power_imbalance" | "isolation" | "escalation" | "mental_health";
  title: string;
  description: string;
  evidence: string[];
  resources: AlertResource;
  guidance?: string;
  is_acknowledged?: boolean;
  created_at?: string;
}

interface ScanResult {
  alerts: SafetyAlert[];
  overall_safety: "safe" | "monitor" | "concern" | "urgent";
  recommendation: string;
}

const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "bg-[#b41340]/10 text-[#b41340] border-[#b41340]/20", dot: "bg-[#b41340]", order: 0 },
  urgent: { label: "Urgent", color: "bg-[#c4652a]/10 text-[#c4652a] border-[#c4652a]/20", dot: "bg-[#c4652a]", order: 1 },
  concern: { label: "Concern", color: "bg-[#705900]/10 text-[#705900] border-[#705900]/20", dot: "bg-[#705900]", order: 2 },
  watch: { label: "Watch", color: "bg-[#3b7a9e]/10 text-[#3b7a9e] border-[#3b7a9e]/20", dot: "bg-[#3b7a9e]", order: 3 },
};

const CATEGORY_ICONS: Record<string, string> = {
  abuse: "\uD83D\uDEA8",
  self_harm: "\uD83D\uDC9C",
  power_imbalance: "\u2696\uFE0F",
  isolation: "\uD83D\uDD12",
  escalation: "\uD83D\uDCC8",
  mental_health: "\uD83E\uDDE0",
};

const CATEGORY_LABELS: Record<string, string> = {
  abuse: "Safety concern",
  self_harm: "Wellbeing",
  power_imbalance: "Relationship balance",
  isolation: "Connection & support",
  escalation: "Pattern change",
  mental_health: "Mental health",
};

export default function SafetyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [overallSafety, setOverallSafety] = useState<string>("safe");
  const [recommendation, setRecommendation] = useState("");
  const [hasRecentScan, setHasRecentScan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkExistingAlerts();
  }, []);

  async function checkExistingAlerts() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/safety");
        return;
      }

      // Check for alerts from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: existingAlerts } = await supabase
        .from("safety_alerts")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (existingAlerts && existingAlerts.length > 0) {
        const mappedAlerts: SafetyAlert[] = existingAlerts.map((a) => ({
          id: a.id,
          severity: a.severity,
          category: a.category,
          title: a.title,
          description: a.description,
          evidence: a.evidence ?? [],
          resources: a.resources ?? {},
          guidance: a.resources?.guidance ?? "",
          is_acknowledged: a.is_acknowledged,
          created_at: a.created_at,
        }));
        setAlerts(mappedAlerts);
        setHasRecentScan(true);

        // Determine overall safety from existing alerts
        const hasCritical = mappedAlerts.some((a) => a.severity === "critical");
        const hasUrgent = mappedAlerts.some((a) => a.severity === "urgent");
        const hasConcern = mappedAlerts.some((a) => a.severity === "concern");
        if (hasCritical || hasUrgent) setOverallSafety("urgent");
        else if (hasConcern) setOverallSafety("concern");
        else setOverallSafety("monitor");
      } else {
        // No recent scan — auto-scan
        await runScan();
      }
    } catch (err) {
      console.error("Error loading safety data:", err);
      setError("Something went wrong loading your safety data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Load recent messages
      const { data: messages } = await supabase
        .from("messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Load recent journal entries
      const { data: journalEntries } = await supabase
        .from("journal_entries")
        .select("content, mood, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const res = await fetch("/api/safety-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages ?? [],
          journalEntries: journalEntries ?? [],
        }),
      });

      const result: ScanResult = await res.json();

      setAlerts(result.alerts);
      setOverallSafety(result.overall_safety);
      setRecommendation(result.recommendation);
      setHasRecentScan(true);
    } catch (err) {
      console.error("Safety scan error:", err);
      setError("We had trouble completing the review. You can try again anytime.");
    } finally {
      setScanning(false);
    }
  }

  async function acknowledgeAlert(alertId: string) {
    const supabase = createClient();
    await supabase
      .from("safety_alerts")
      .update({ is_acknowledged: true })
      .eq("id", alertId);

    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_acknowledged: true } : a))
    );
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#7a766f]">Loading your safety overview...</p>
        </div>
      </div>
    );
  }

  const sortedAlerts = [...alerts].sort(
    (a, b) => SEVERITY_CONFIG[a.severity].order - SEVERITY_CONFIG[b.severity].order
  );

  const hasUrgentOrCritical = alerts.some(
    (a) => (a.severity === "urgent" || a.severity === "critical") && !a.is_acknowledged
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto stagger-in">
          {/* Back button */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-[#7a766f] hover:text-[#312e29] transition-colors mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to chat
          </button>

          {/* Heading */}
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] mb-3 tracking-tight">
            Your Safety Check
          </h1>
          <p className="text-[#7a766f] text-[15px] leading-relaxed mb-8">
            We quietly review your conversations and journal entries for signs of unhealthy dynamics. This is a supportive tool, not a diagnosis.
          </p>

          {/* Scanning state */}
          {scanning && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm mb-6 text-center">
              <div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[15px] text-[#312e29] font-medium mb-1">Reviewing your recent conversations...</p>
              <p className="text-sm text-[#7a766f]">This usually takes a few seconds.</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-sm text-[#7a766f] mb-3">{error}</p>
              <button
                type="button"
                onClick={runScan}
                disabled={scanning}
                className="text-sm text-[#8d4837] font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Immediate danger banner */}
          {hasUrgentOrCritical && !scanning && (
            <div className="bg-[#b41340]/5 border border-[#b41340]/15 rounded-2xl p-5 mb-6">
              <p className="text-[15px] font-medium text-[#312e29] mb-1">
                If you are in immediate danger, please call 911 or your local emergency services.
              </p>
              <p className="text-sm text-[#7a766f]">
                You can also reach the National DV Hotline at{" "}
                <a href="tel:18007997233" className="text-[#8d4837] font-medium">1-800-799-7233</a>.
              </p>
            </div>
          )}

          {/* Safe state */}
          {!scanning && hasRecentScan && alerts.length === 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-8 shadow-sm mb-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#68b89e]/15 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#68b89e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="font-heading text-xl font-semibold text-[#312e29] mb-2">No concerns detected</h2>
              <p className="text-sm text-[#7a766f] leading-relaxed max-w-sm mx-auto mb-1">
                {recommendation || "We reviewed your recent conversations and journal entries. Everything looks okay."}
              </p>
              <p className="text-xs text-[#b1ada5] mt-3">
                We check passively whenever you visit this page.
              </p>
            </div>
          )}

          {/* Recommendation */}
          {!scanning && hasRecentScan && alerts.length > 0 && recommendation && (
            <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-[15px] text-[#312e29] leading-relaxed">{recommendation}</p>
            </div>
          )}

          {/* Alerts */}
          {!scanning && sortedAlerts.length > 0 && (
            <div className="space-y-4 mb-8">
              {sortedAlerts.map((alert, i) => {
                const sevConfig = SEVERITY_CONFIG[alert.severity];
                const categoryIcon = CATEGORY_ICONS[alert.category] ?? "\uD83D\uDCA1";
                const categoryLabel = CATEGORY_LABELS[alert.category] ?? alert.category;

                return (
                  <div
                    key={alert.id ?? i}
                    className={`bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm ${
                      alert.is_acknowledged ? "opacity-70" : ""
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{categoryIcon}</span>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[#312e29]">{alert.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${sevConfig.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`} />
                              {sevConfig.label}
                            </span>
                            <span className="text-[11px] text-[#b1ada5]">{categoryLabel}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[#312e29] leading-relaxed mb-3">{alert.description}</p>

                    {/* Evidence */}
                    {alert.evidence.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {alert.evidence.map((e, j) => (
                          <p key={j} className="text-xs text-[#7a766f] italic pl-3 border-l-2 border-[#e2dcd1]">
                            &ldquo;{e}&rdquo;
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Guidance */}
                    {(alert.guidance || alert.resources?.guidance) && (
                      <p className="text-sm text-[#7a766f] leading-relaxed mb-3 bg-[#fcf6ed] rounded-xl p-3">
                        {alert.guidance || (alert.resources as AlertResource & { guidance?: string })?.guidance}
                      </p>
                    )}

                    {/* Resources */}
                    {alert.resources?.primary && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        <a
                          href={`tel:${alert.resources.primary.contact.replace(/[^0-9]/g, "")}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8d4837] bg-[#8d4837]/8 rounded-full px-3 py-1.5 hover:bg-[#8d4837]/15 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          {alert.resources.primary.name}: {alert.resources.primary.contact}
                        </a>
                        {alert.resources.text && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#705900] bg-[#705900]/8 rounded-full px-3 py-1.5">
                            {alert.resources.text.contact}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Acknowledge */}
                    {alert.id && !alert.is_acknowledged && (
                      <button
                        type="button"
                        onClick={() => acknowledgeAlert(alert.id!)}
                        className="text-xs text-[#7a766f] hover:text-[#312e29] transition-colors mt-1"
                      >
                        I&apos;ve seen this
                      </button>
                    )}
                    {alert.is_acknowledged && (
                      <span className="text-xs text-[#b1ada5]">Acknowledged</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Run new scan button */}
          {!scanning && hasRecentScan && (
            <button
              type="button"
              onClick={runScan}
              className="w-full bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl px-5 py-3.5 text-sm font-medium text-[#312e29] hover:bg-white hover:border-[#b1ada5] transition-all shadow-sm mb-8"
            >
              Run a new scan
            </button>
          )}

          {/* Crisis Resources — always visible */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
            <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-1">
              Crisis Resources
            </h2>
            <p className="text-xs text-[#7a766f] mb-4">Just in case you ever need them.</p>

            <div className="space-y-3">
              <div className="rounded-xl bg-white/80 border border-[#e2dcd1] p-3.5">
                <p className="text-[11px] font-medium tracking-wide uppercase text-[#b41340] mb-0.5">
                  National Domestic Violence Hotline
                </p>
                <a href="tel:18007997233" className="text-sm font-semibold text-[#312e29] hover:text-[#8d4837] transition-colors">
                  1-800-799-7233
                </a>
              </div>

              <div className="rounded-xl bg-white/80 border border-[#e2dcd1] p-3.5">
                <p className="text-[11px] font-medium tracking-wide uppercase text-[#b41340] mb-0.5">
                  Crisis Text Line
                </p>
                <p className="text-sm font-semibold text-[#312e29]">
                  Text <span className="text-[#8d4837]">HOME</span> to <span className="text-[#8d4837]">741741</span>
                </p>
              </div>

              <div className="rounded-xl bg-white/80 border border-[#e2dcd1] p-3.5">
                <p className="text-[11px] font-medium tracking-wide uppercase text-[#b41340] mb-0.5">
                  988 Suicide & Crisis Lifeline
                </p>
                <a href="tel:988" className="text-sm font-semibold text-[#312e29] hover:text-[#8d4837] transition-colors">
                  Call or text <span className="text-[#8d4837]">988</span>
                </a>
              </div>

              <div className="rounded-xl bg-white/80 border border-[#e2dcd1] p-3.5">
                <p className="text-[11px] font-medium tracking-wide uppercase text-[#7a766f] mb-0.5">
                  International
                </p>
                <p className="text-sm text-[#312e29]">
                  Contact your local emergency services or visit{" "}
                  <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="text-[#8d4837] underline underline-offset-2">
                    findahelpline.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Professional help section */}
          <div className="bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl p-5 shadow-sm mb-6">
            <h2 className="font-heading text-lg font-semibold text-[#312e29] mb-2">
              Talk to a professional
            </h2>
            <p className="text-sm text-[#7a766f] leading-relaxed mb-3">
              A trained counselor can help you explore what you&apos;re feeling in a safe, confidential space.
            </p>
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#8d4837] hover:underline"
            >
              Find a helpline near you
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-[#b1ada5] text-center leading-relaxed px-4 pb-4">
            Remember: this tool is not a substitute for professional assessment. If something feels wrong, trust your instincts.
          </p>
        </div>
      </div>
    </div>
  );
}
