import type { Metadata } from "next";
import Link from "next/link";
import ShareActions from "./ShareActions";

interface SharePageProps {
  params: Promise<{ data: string }>;
}

function decodeShareData(encoded: string): { name: string; tagline: string; emoji: string } | null {
  try {
    const json = atob(decodeURIComponent(encoded));
    const parsed = JSON.parse(json);
    if (parsed.name && parsed.tagline && parsed.emoji) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { data } = await params;
  const archetype = decodeShareData(data);
  if (!archetype) {
    return { title: "RelAI — Your Relationship Coach" };
  }
  return {
    title: `I'm a ${archetype.name} — RelAI`,
    description: archetype.tagline,
    openGraph: {
      title: `${archetype.emoji} I'm a ${archetype.name}`,
      description: `"${archetype.tagline}" — Discover your relationship archetype with RelAI.`,
      siteName: "RelAI",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${archetype.emoji} I'm a ${archetype.name}`,
      description: `"${archetype.tagline}" — Discover your relationship archetype with RelAI.`,
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { data } = await params;
  const archetype = decodeShareData(data);

  if (!archetype) {
    return (
      <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center px-6">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-lg text-[#1a1008] mb-4">This share link is invalid.</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-6 py-3 text-white font-semibold text-sm hover:shadow-md transition-all"
          >
            Go to RelAI
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-warm flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Archetype Card */}
        <div className="glass-card p-8 sm:p-10 text-center mb-6">
          {/* Badge */}
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{
              background: "linear-gradient(135deg, rgba(74,124,107,0.15), rgba(74,124,107,0.3))",
              border: "2px solid rgba(74,124,107,0.25)",
            }}
          >
            <span className="text-5xl">{archetype.emoji}</span>
          </div>

          <p className="text-xs tracking-[0.2em] uppercase font-medium text-[#4a7c6b] mb-3">
            My relationship archetype
          </p>

          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#1a1008] mb-4 tracking-tight">
            {archetype.name}
          </h1>

          <p className="text-lg text-[#8a7a66] italic leading-relaxed">
            &ldquo;{archetype.tagline}&rdquo;
          </p>

          {/* Divider */}
          <div className="accent-divider my-8" />

          {/* Branding */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4a7c6b] to-[#2d4e43] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#1a1008] tracking-tight">RelAI</span>
          </div>
          <p className="text-xs text-[#8a7a66]">AI-powered relationship coaching</p>
        </div>

        {/* Share Actions (client component) */}
        <ShareActions />

        {/* CTA */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-block w-full rounded-xl bg-gradient-to-r from-[#4a7c6b] to-[#2d4e43] px-6 py-4 text-white font-semibold text-base hover:shadow-md transition-all btn-glow"
          >
            Discover your archetype
          </Link>
          <p className="text-[10px] text-[#c4bbaf] mt-4 tracking-wide">
            Take a 5-minute quiz grounded in attachment theory and real science.
          </p>
        </div>
      </div>
    </div>
  );
}
