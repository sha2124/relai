"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArchetype, type Archetype } from "@/lib/quiz/archetypes";

interface ProfileData {
  name: string;
  attachment_style: { primary: string };
  communication_style: { primary: string };
  conflict_response: { primary: string };
}

export default function PartnerJoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [status, setStatus] = useState<"loading" | "linking" | "success" | "error" | "already-linked" | "no-profile">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [myArchetype, setMyArchetype] = useState<Archetype | null>(null);
  const [partnerArchetype, setPartnerArchetype] = useState<Archetype | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");
  const [myName, setMyName] = useState<string>("");

  useEffect(() => {
    async function linkPartner() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/auth?next=/partner/join/${code}`);
        return;
      }

      // Look up invite
      const { data: invite, error: inviteError } = await supabase
        .from("partner_links")
        .select("*")
        .eq("invite_code", code)
        .single();

      if (inviteError || !invite) {
        setErrorMsg("This invite link is invalid or has expired.");
        setStatus("error");
        return;
      }

      if (invite.user_id === user.id) {
        setErrorMsg("You can't accept your own invite link.");
        setStatus("error");
        return;
      }

      if (invite.status === "linked") {
        if (invite.partner_id === user.id) {
          setStatus("already-linked");
        } else {
          setErrorMsg("This invite has already been used by someone else.");
          setStatus("error");
        }
        return;
      }

      // Check if user has a profile
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, attachment_style, communication_style, conflict_response")
        .eq("user_id", user.id)
        .single();

      if (!myProfile) {
        // Store invite code so quiz redirects back here after completion
        localStorage.setItem("relai-partner-invite", code);
        setStatus("no-profile");
        return;
      }

      setStatus("linking");

      // Link the partner
      const { error: updateError } = await supabase
        .from("partner_links")
        .update({
          partner_id: user.id,
          status: "linked",
        })
        .eq("id", invite.id);

      if (updateError) {
        setErrorMsg("Something went wrong linking your accounts. Please try again.");
        setStatus("error");
        return;
      }

      // Load both profiles for display
      const mp = myProfile as ProfileData;
      setMyName(mp.name);
      setMyArchetype(
        getArchetype(
          mp.attachment_style.primary,
          mp.communication_style.primary,
          mp.conflict_response.primary
        )
      );

      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("name, attachment_style, communication_style, conflict_response")
        .eq("user_id", invite.user_id)
        .single();

      if (creatorProfile) {
        const cp = creatorProfile as ProfileData;
        setPartnerName(cp.name);
        setPartnerArchetype(
          getArchetype(
            cp.attachment_style.primary,
            cp.communication_style.primary,
            cp.conflict_response.primary
          )
        );
      }

      setStatus("success");
    }

    linkPartner();
  }, [code, router]);

  if (status === "loading" || status === "linking") {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center">
        <div className="text-center stagger-in">
          <div className="w-8 h-8 border-2 border-[#4a7c6b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8a7a66] text-sm">
            {status === "linking" ? "Linking your profiles..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "no-profile") {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center px-6">
        <div className="max-w-lg mx-auto text-center stagger-in">
          <div className="h-20 w-20 rounded-full bg-[#c4849c]/10 border-2 border-[#c4849c]/20 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c4849c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[#1a1008] mb-3">
            Take the quiz first
          </h1>
          <p className="text-[#8a7a66] mb-6">
            You need to complete the relationship quiz before linking with your partner.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/quiz`)}
            className="rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-6 py-3 text-white font-semibold hover:shadow-md transition-all"
          >
            Take the quiz
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center px-6">
        <div className="max-w-lg mx-auto text-center stagger-in">
          <div className="h-20 w-20 rounded-full bg-[#c45c5c]/10 border-2 border-[#c45c5c]/20 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c45c5c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[#1a1008] mb-3">
            Something went wrong
          </h1>
          <p className="text-[#8a7a66] mb-6">{errorMsg}</p>
          <button
            type="button"
            onClick={() => router.push("/partner")}
            className="rounded-xl border border-[#e8e4df] bg-white/50 px-6 py-3 text-sm text-[#4a7c6b] font-medium hover:bg-white transition-all"
          >
            Go to partner page
          </button>
        </div>
      </div>
    );
  }

  // Success or already-linked
  return (
    <div className="min-h-[100dvh] bg-gradient-warm">
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto text-center stagger-in">
          <div className="h-20 w-20 rounded-full bg-[#4a7c6b]/10 border-2 border-[#4a7c6b]/20 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a7c6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>

          <h1 className="font-heading text-3xl font-semibold text-[#1a1008] mb-3 tracking-tight">
            {status === "already-linked" ? "You're already linked!" : "You're linked!"}
          </h1>
          <p className="text-[#8a7a66] text-base mb-8">
            {myName && partnerName
              ? `${myName} and ${partnerName}, your profiles are now connected.`
              : "Your profiles are now connected."}
          </p>

          {/* Side by side archetypes */}
          {myArchetype && partnerArchetype && (
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm text-center">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${myArchetype.color}20, ${myArchetype.color}40)`,
                      border: `2px solid ${myArchetype.color}30`,
                    }}
                  >
                    <span className="text-xl">{myArchetype.emoji}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8a7a66] mb-1">
                    {myName || "You"}
                  </p>
                  <p className="font-heading text-sm font-semibold text-[#1a1008]">
                    {myArchetype.name}
                  </p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-[#e8e4df] rounded-2xl p-5 shadow-sm text-center">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${partnerArchetype.color}20, ${partnerArchetype.color}40)`,
                      border: `2px solid ${partnerArchetype.color}30`,
                    }}
                  >
                    <span className="text-xl">{partnerArchetype.emoji}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8a7a66] mb-1">
                    {partnerName || "Partner"}
                  </p>
                  <p className="font-heading text-sm font-semibold text-[#1a1008]">
                    {partnerArchetype.name}
                  </p>
                </div>
              </div>

              <div
                className="rounded-2xl p-6 shadow-sm text-left"
                style={{
                  background: `linear-gradient(135deg, ${myArchetype.color}08, ${partnerArchetype.color}15)`,
                  border: `1px solid ${myArchetype.color}20`,
                }}
              >
                <p className="text-xs font-medium tracking-wide uppercase text-[#4a7c6b] mb-3">
                  Compatibility Insight
                </p>
                <p className="text-[#2d2418] text-sm leading-relaxed">
                  As a <strong>{myArchetype.name}</strong> paired with a <strong>{partnerArchetype.name}</strong>, your
                  relationship has a unique dynamic. Your strengths
                  ({myArchetype.strengths[0].toLowerCase()}) complement
                  theirs ({partnerArchetype.strengths[0].toLowerCase()}).
                  Watch for tension between your blind spot
                  ({myArchetype.blindSpots[0].toLowerCase()}) and theirs
                  ({partnerArchetype.blindSpots[0].toLowerCase()}).
                  Growth happens when you both lean into your edges.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-5 py-4 text-white font-semibold text-base hover:shadow-md transition-all"
            >
              Start a coaching session
            </button>
            <button
              type="button"
              onClick={() => router.push("/partner")}
              className="w-full rounded-xl border border-[#e8e4df] bg-white/50 px-5 py-3 text-sm text-[#8a7a66] hover:text-[#1a1008] hover:bg-white transition-all"
            >
              View partner page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
