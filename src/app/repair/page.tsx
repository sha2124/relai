"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";

/* ── Types ── */
interface ProfileData {
  name: string;
  attachment_style: { primary: string };
  communication_style: { primary: string };
  conflict_response: { primary: string };
}

interface RepairScript {
  grounding: string;
  script: {
    opening: string;
    acknowledgment: string;
    vulnerability: string;
    request: string;
  };
  expectations: string;
  fallback: string;
}

/* ── Constants ── */
const EMOTIONS = [
  "Hurt",
  "Angry",
  "Frustrated",
  "Guilty",
  "Scared",
  "Confused",
  "Sad",
  "Overwhelmed",
  "Shut down",
  "Defensive",
];

const GOALS = [
  { label: "Reconnect tonight", icon: "favorite" },
  { label: "Apologize", icon: "handshake" },
  { label: "Understand their side", icon: "visibility" },
  { label: "Set a boundary", icon: "shield" },
  { label: "Start over", icon: "restart_alt" },
];

const STEP_LABELS = ["What happened", "Your feelings", "Their feelings", "Your goal", "Your script"];

export default function RepairPage() {
  const router = useRouter();

  /* ── Form state ── */
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState("");
  const [myFeelings, setMyFeelings] = useState<string[]>([]);
  const [theirFeelings, setTheirFeelings] = useState<string[]>([]);
  const [goal, setGoal] = useState("");

  /* ── Profile / partner state ── */
  const [myArchetype, setMyArchetype] = useState<Archetype | null>(null);
  const [partnerArchetype, setPartnerArchetype] = useState<Archetype | null>(null);

  /* ── Results state ── */
  const [result, setResult] = useState<RepairScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  /* ── Load user profile + partner ── */
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // My profile
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, attachment_style, communication_style, conflict_response")
        .eq("user_id", user.id)
        .single();

      if (myProfile) {
        const p = myProfile as ProfileData;
        setMyArchetype(
          getArchetype(
            p.attachment_style.primary,
            p.communication_style.primary,
            p.conflict_response.primary
          )
        );
      }

      // Check partner link (as initiator)
      const { data: myLink } = await supabase
        .from("partner_links")
        .select("partner_id, status")
        .eq("user_id", user.id)
        .eq("status", "linked")
        .limit(1)
        .maybeSingle();

      let partnerId = myLink?.partner_id;

      // Also check if I'm the invited partner
      if (!partnerId) {
        const { data: asPartner } = await supabase
          .from("partner_links")
          .select("user_id, status")
          .eq("partner_id", user.id)
          .eq("status", "linked")
          .limit(1)
          .maybeSingle();
        if (asPartner) partnerId = asPartner.user_id;
      }

      if (partnerId) {
        const { data: pProfile } = await supabase
          .from("profiles")
          .select("name, attachment_style, communication_style, conflict_response")
          .eq("user_id", partnerId)
          .single();

        if (pProfile) {
          const pp = pProfile as ProfileData;
          setPartnerArchetype(
            getArchetype(
              pp.attachment_style.primary,
              pp.communication_style.primary,
              pp.conflict_response.primary
            )
          );
        }
      }
    }
    load();
  }, []);

  /* ── Helpers ── */
  function toggleFeeling(
    feeling: string,
    list: string[],
    setter: (v: string[]) => void
  ) {
    setter(
      list.includes(feeling)
        ? list.filter((f) => f !== feeling)
        : [...list, feeling]
    );
  }

  function canProceed(): boolean {
    if (step === 0) return situation.trim().length >= 10;
    if (step === 1) return myFeelings.length > 0;
    if (step === 2) return theirFeelings.length > 0;
    if (step === 3) return goal !== "";
    return false;
  }

  async function generate() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          myFeelings,
          theirFeelings,
          goal,
          myArchetype: myArchetype ?? undefined,
          partnerArchetype: partnerArchetype ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      const data: RepairScript = await res.json();
      setResult(data);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string, sectionKey: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionKey);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      // Fallback
    }
  }

  function handleNext() {
    if (step === 3) {
      generate();
    } else {
      setStep((s) => s + 1);
    }
  }

  /* ── Render helpers ── */
  function renderStepIndicator() {
    return (
      <div className="flex items-center gap-1 mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-full h-1.5 rounded-full transition-all duration-500 ${
                  i < step
                    ? "bg-[#8d4837]"
                    : i === step
                    ? "bg-[#8d4837]/60"
                    : "bg-[#e2dcd1]"
                }`}
              />
              <span
                className={`text-[10px] mt-1.5 transition-colors ${
                  i <= step ? "text-[#8d4837] font-medium" : "text-[#b1ada5]"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderEmotionChips(
    selected: string[],
    setter: (v: string[]) => void
  ) {
    return (
      <div className="flex flex-wrap gap-2.5">
        {EMOTIONS.map((emotion) => {
          const isActive = selected.includes(emotion);
          return (
            <button
              key={emotion}
              type="button"
              onClick={() => toggleFeeling(emotion, selected, setter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#8d4837] text-white shadow-sm"
                  : "bg-white/60 border border-[#e2dcd1] text-[#5e5b54] hover:bg-white hover:border-[#b1ada5]"
              }`}
            >
              {emotion}
            </button>
          );
        })}
      </div>
    );
  }

  function renderScriptCard(
    label: string,
    content: string,
    sectionKey: string,
    isScript?: boolean
  ) {
    return (
      <div
        className={`rounded-2xl p-5 ${
          isScript
            ? "bg-[#fcf0e8] border border-[#e8cfc0]"
            : "bg-white/70 backdrop-blur-sm border border-[#e2dcd1]"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8d4837]">
            {label}
          </span>
          <button
            type="button"
            onClick={() => copyText(content, sectionKey)}
            className="flex items-center gap-1 text-xs text-[#7a766f] hover:text-[#8d4837] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {copiedSection === sectionKey ? "check" : "content_copy"}
            </span>
            {copiedSection === sectionKey ? "Copied" : "Copy"}
          </button>
        </div>
        <p
          className={`leading-relaxed ${
            isScript
              ? "text-[#312e29] text-[17px] font-medium"
              : "text-[#5e5b54] text-sm"
          }`}
        >
          {isScript ? `"${content}"` : content}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors mb-6 flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_back
            </span>
            Back
          </button>

          {/* Title */}
          <div className="mb-2">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#312e29] tracking-tight">
              Repair Script
            </h1>
            <p className="text-[#7a766f] text-base mt-2 leading-relaxed">
              {step < 4
                ? "Tell me what happened. I'll help you find the right words."
                : "Here's your script. Read it through, take a breath, then go say it."}
            </p>
          </div>

          {/* Step indicator */}
          <div className="mt-6">{renderStepIndicator()}</div>

          {/* ── Step 0: What happened ── */}
          {step === 0 && (
            <div className="space-y-4 animate-in">
              <label className="block">
                <span className="text-sm font-medium text-[#312e29] mb-2 block">
                  What happened?
                </span>
                <span className="text-xs text-[#7a766f] block mb-3">
                  Describe the fight, disagreement, or moment of disconnection. Be specific — the more detail, the more personalized your script will be.
                </span>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="We were talking about the weekend plans and I got frustrated when they changed everything without asking me. I raised my voice and they shut down..."
                  rows={6}
                  className="w-full bg-white/70 backdrop-blur-sm border border-[#e2dcd1] rounded-2xl px-4 py-3 text-[#312e29] text-sm placeholder:text-[#b1ada5] focus:outline-none focus:border-[#8d4837] focus:ring-1 focus:ring-[#8d4837]/20 resize-none transition-all"
                />
              </label>
            </div>
          )}

          {/* ── Step 1: My feelings ── */}
          {step === 1 && (
            <div className="space-y-4 animate-in">
              <div>
                <span className="text-sm font-medium text-[#312e29] block mb-1">
                  How are you feeling right now?
                </span>
                <span className="text-xs text-[#7a766f] block mb-4">
                  Pick all that apply. There are no wrong answers.
                </span>
                {renderEmotionChips(myFeelings, setMyFeelings)}
              </div>
            </div>
          )}

          {/* ── Step 2: Their feelings ── */}
          {step === 2 && (
            <div className="space-y-4 animate-in">
              <div>
                <span className="text-sm font-medium text-[#312e29] block mb-1">
                  What do you think your partner is feeling?
                </span>
                <span className="text-xs text-[#7a766f] block mb-4">
                  Your best guess. This helps generate a script that meets them where they are.
                </span>
                {renderEmotionChips(theirFeelings, setTheirFeelings)}
              </div>
            </div>
          )}

          {/* ── Step 3: Goal ── */}
          {step === 3 && (
            <div className="space-y-4 animate-in">
              <div>
                <span className="text-sm font-medium text-[#312e29] block mb-1">
                  What do you want to happen next?
                </span>
                <span className="text-xs text-[#7a766f] block mb-4">
                  Pick the one that feels most true right now.
                </span>
                <div className="space-y-2.5">
                  {GOALS.map((g) => {
                    const isActive = goal === g.label;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setGoal(g.label)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-[#8d4837] text-white shadow-sm"
                            : "bg-white/60 border border-[#e2dcd1] text-[#5e5b54] hover:bg-white hover:border-[#b1ada5]"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 20 }}
                        >
                          {g.icon}
                        </span>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Results ── */}
          {step === 4 && result && (
            <div className="space-y-4 stagger-in">
              {/* Grounding */}
              {renderScriptCard(
                "Before you speak",
                result.grounding,
                "grounding"
              )}

              {/* Script sections */}
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8d4837] block px-1">
                  Your repair script
                </span>
                {renderScriptCard(
                  "Opening",
                  result.script.opening,
                  "opening",
                  true
                )}
                {renderScriptCard(
                  "Acknowledgment",
                  result.script.acknowledgment,
                  "acknowledgment",
                  true
                )}
                {renderScriptCard(
                  "Vulnerability",
                  result.script.vulnerability,
                  "vulnerability",
                  true
                )}
                {renderScriptCard(
                  "Request",
                  result.script.request,
                  "request",
                  true
                )}
              </div>

              {/* Copy full script */}
              <button
                type="button"
                onClick={() =>
                  copyText(
                    `${result.script.opening}\n\n${result.script.acknowledgment}\n\n${result.script.vulnerability}\n\n${result.script.request}`,
                    "full-script"
                  )
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#8d4837]/10 text-[#8d4837] text-sm font-medium hover:bg-[#8d4837]/15 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {copiedSection === "full-script" ? "check" : "content_copy"}
                </span>
                {copiedSection === "full-script" ? "Copied full script" : "Copy full script"}
              </button>

              {/* Expectations */}
              {renderScriptCard(
                "What to expect",
                result.expectations,
                "expectations"
              )}

              {/* Fallback */}
              {renderScriptCard(
                "If it doesn't go well",
                result.fallback,
                "fallback"
              )}

              {/* Practice with coach */}
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(
                    "relai-exercise-prompt",
                    `I just had a fight with my partner. Here's what happened: ${situation}. I'm feeling ${myFeelings.join(", ")}. Can you help me practice what to say before I go talk to them?`
                  );
                  router.push("/");
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#8d4837] text-white text-sm font-semibold btn-glow"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  chat
                </span>
                Practice with coach
              </button>

              {/* Start over */}
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setSituation("");
                  setMyFeelings([]);
                  setTheirFeelings([]);
                  setGoal("");
                  setResult(null);
                  setError("");
                }}
                className="w-full text-center text-sm text-[#7a766f] hover:text-[#8d4837] transition-colors py-2"
              >
                Generate a new script
              </button>
            </div>
          )}

          {/* ── Navigation buttons (steps 0-3) ── */}
          {step < 4 && (
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 px-4 py-3 rounded-xl border border-[#e2dcd1] text-sm text-[#5e5b54] hover:bg-white transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    arrow_back
                  </span>
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  canProceed() && !loading
                    ? "bg-[#8d4837] text-white btn-glow"
                    : "bg-[#e2dcd1] text-[#b1ada5] cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>
                      progress_activity
                    </span>
                    Generating your script...
                  </>
                ) : step === 3 ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      auto_fix_high
                    </span>
                    Generate repair script
                  </>
                ) : (
                  <>
                    Next
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Inline animation styles */}
      <style jsx>{`
        .animate-in {
          animation: fadeSlideIn 0.35s ease-out;
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
