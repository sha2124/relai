"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8d4837] border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const mode = searchParams.get("mode");
  const isPartnerInvite = nextPath.includes("/partner/join/");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push(nextPath);
        router.refresh();
      }
    } else {
      // Sign up with auto-confirm (no email verification)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextPath}`,
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        // Auto-confirmed — go straight in
        router.push(nextPath);
        router.refresh();
      } else {
        // Email confirmation required — show message
        setError("");
        setIsLogin(true);
        setEmail("");
        setPassword("");
        // Try to sign in immediately in case auto-confirm is enabled
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.user?.email ?? email,
          password,
        });
        if (!signInError) {
          router.push(nextPath);
          router.refresh();
        }
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#8d4837] to-[#6d2e20] flex items-center justify-center avatar-glow mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[#312e29] tracking-tight">
            {isPartnerInvite
              ? "Join your partner"
              : isLogin ? "Welcome back" : "Save your results"}
          </h1>
          <p className="text-sm text-[#7a766f] mt-1">
            {isPartnerInvite
              ? "Sign in or create a free account to link with your partner"
              : isLogin
                ? "Sign in to continue your coaching"
                : "Create a free account to unlock your AI coach"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#312e29] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#e2dcd1] bg-white/70 px-4 py-3 text-sm text-[#312e29] placeholder-[#b1ada5] focus:outline-none focus:ring-2 focus:ring-[#8d4837]/30 focus:border-[#8d4837] transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#312e29] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-[#e2dcd1] bg-white/70 px-4 py-3 text-sm text-[#312e29] placeholder-[#b1ada5] focus:outline-none focus:ring-2 focus:ring-[#8d4837]/30 focus:border-[#8d4837] transition-all"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#8d4837] to-[#6d2e20] px-5 py-3.5 text-white font-semibold text-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            {loading ? "..." : isLogin ? "Sign in" : "Create free account"}
          </button>
        </form>

        {/* What you get */}
        {!isLogin && (
          <div className="mt-6 bg-white/50 border border-[#e2dcd1] rounded-xl p-4">
            <p className="text-xs font-medium text-[#8d4837] mb-2">Free account includes:</p>
            <ul className="space-y-1.5 text-xs text-[#5e5b54]">
              <li className="flex gap-2"><span className="text-[#8d4837]">&#10003;</span> Your archetype saved permanently</li>
              <li className="flex gap-2"><span className="text-[#8d4837]">&#10003;</span> AI relationship coach chat</li>
              <li className="flex gap-2"><span className="text-[#8d4837]">&#10003;</span> Conversation history remembered</li>
              <li className="flex gap-2"><span className="text-[#8d4837]">&#10003;</span> Pattern tracking over time</li>
            </ul>
          </div>
        )}

        {/* Toggle */}
        <p className="text-center text-sm text-[#7a766f] mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-[#8d4837] font-medium hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        {/* Back */}
        <p className="text-center mt-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-[#b1ada5] hover:text-[#7a766f] transition-colors"
          >
            Back to home
          </button>
        </p>

        {/* Privacy note */}
        <p className="text-center text-[10px] text-[#b1ada5] mt-6">
          Your data stays private. We never sell or share your relationship data.
        </p>
      </div>
    </div>
  );
}
