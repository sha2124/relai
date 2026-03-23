# CLAUDE.md

## Project Overview

RelAI is an AI relationship coach app. Users take a personality quiz (attachment style, communication style, love language, conflict patterns), get a profile, then chat with an AI coach that remembers their patterns and pushes them toward real human connection.

**Core principle:** "Push people toward each other, not toward the app." This is a practice space, not a replacement for real relationships.

## Tech Stack

- **Framework:** Next.js 16 + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **AI:** OpenRouter API (Kimi K2.5 model: `moonshotai/kimi-k2.5`) via OpenAI SDK compatibility
- **Database:** Supabase (auth, profiles, messages) with RLS enabled
- **State:** Zustand
- **Hosting:** Vercel (hobby tier)

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes (chat endpoint)
│   ├── auth/         # Auth pages (login/signup)
│   ├── profile/      # Profile result page
│   ├── quiz/         # Onboarding quiz flow
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Landing page
├── components/
│   ├── Chat.tsx      # Main chat container
│   ├── ChatInput.tsx # Message input
│   ├── ChatMessage.tsx # Message bubble
│   └── quiz/         # Quiz step components
├── lib/
│   ├── quiz/         # Quiz logic, questions, scoring
│   ├── supabase/     # Supabase client (browser + server)
│   ├── summarize.ts  # Conversation memory summarization
│   └── system-prompt.ts # AI coach persona + profile context
└── middleware.ts     # Auth route protection
```

## Key Architecture Decisions

- **Quiz-first flow:** Users must sign up + complete quiz before accessing chat
- **OpenRouter, not Anthropic API:** Uses OpenAI SDK pointed at OpenRouter for model flexibility
- **Conversation memory:** Auto-summarizes messages beyond 20 and feeds summary as context
- **localStorage fallback:** Profile data cached locally in case Supabase is unreachable
- **RLS enforced:** Users can only access their own profiles and messages

## Database Schema (Supabase)

- `profiles`: user_id, name, attachment_style (jsonb), communication_style (jsonb), conflict_response (jsonb), love_language (jsonb), goal, scores
- `messages`: user_id, role, content, created_at

## Commands

```bash
npm run dev     # Local dev server
npm run build   # Production build (run before deploying)
npm run lint    # ESLint
```

## Environment Variables

- `OPENROUTER_API_KEY` — OpenRouter API key (server-side only)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key

## What's Built vs Not Built

**Done:** Landing page, onboarding quiz (14 questions), profile results, AI chat with streaming, Supabase auth, profile persistence, conversation history + memory summarization

**Not yet:** Partner features (describe/invite), relationship dashboard, voice (notes → real-time), mediated sessions, conflict detection, Stripe billing

## Working Conventions

- Keep the AI coach persona warm but evidence-based (Gottman, attachment theory, NVC)
- Safety guardrails: never take sides, detect power imbalances, nudge toward real conversations
- Free tier limits are a feature, not a bug (prevent over-reliance on the app)
