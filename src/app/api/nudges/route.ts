import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "anthropic/claude-sonnet-4";

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface JournalEntry {
  content: string;
  mood: string | null;
  tags: string[] | null;
  created_at: string;
}

interface NudgePayload {
  type: "follow_up" | "check_in" | "encouragement" | "exercise" | "reflection";
  title: string;
  content: string;
  context: string;
  action_type: "chat" | "journal" | "exercise" | "partner" | null;
  action_label: string | null;
  action_url: string | null;
}

export async function POST(request: Request) {
  try {
    const { messages, journalEntries, archetype, existingNudgeTypes } =
      (await request.json()) as {
        messages: Message[];
        journalEntries: JournalEntry[];
        archetype?: string;
        existingNudgeTypes?: string[];
      };

    // Build condensed transcripts (last 30 messages, last 10 journal entries)
    const recentMessages = (messages ?? []).slice(-30);
    const recentJournal = (journalEntries ?? []).slice(-10);

    const messageTranscript = recentMessages
      .map(
        (m) =>
          `[${new Date(m.created_at).toLocaleDateString()}] ${m.role}: ${m.content}`
      )
      .join("\n");

    const journalTranscript = recentJournal
      .map(
        (j) =>
          `[${new Date(j.created_at).toLocaleDateString()}] Journal (mood: ${j.mood ?? "unset"}, tags: ${j.tags?.join(", ") ?? "none"}): ${j.content}`
      )
      .join("\n");

    // Calculate activity stats for the AI
    const now = new Date();
    const lastMessageDate = recentMessages.length > 0
      ? new Date(recentMessages[recentMessages.length - 1].created_at)
      : null;
    const lastJournalDate = recentJournal.length > 0
      ? new Date(recentJournal[recentJournal.length - 1].created_at)
      : null;
    const daysSinceLastMessage = lastMessageDate
      ? Math.floor((now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const daysSinceLastJournal = lastJournalDate
      ? Math.floor((now.getTime() - lastJournalDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Count consecutive days with activity (streak)
    const activityDates = new Set<string>();
    recentMessages.forEach((m) =>
      activityDates.add(new Date(m.created_at).toLocaleDateString())
    );
    recentJournal.forEach((j) =>
      activityDates.add(new Date(j.created_at).toLocaleDateString())
    );

    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - i);
      if (activityDates.has(checkDate.toLocaleDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const systemPrompt = `You are a warm, intuitive relationship coach for RelAI. Your job is to generate 1-3 personalized daily nudges based on the user's recent activity.

${archetype ? `The user's relationship archetype is: ${archetype}. Let this inform your nudges.` : ""}

Today's date: ${now.toLocaleDateString()}
Days since last chat: ${daysSinceLastMessage ?? "never chatted"}
Days since last journal: ${daysSinceLastJournal ?? "never journaled"}
Current streak: ${streak} day(s) of activity
${existingNudgeTypes?.length ? `Already generated today: ${existingNudgeTypes.join(", ")} — avoid duplicating these types.` : ""}

Nudge types you can create:
1. **follow_up** — Reference something specific from a recent conversation and ask how it went. Be specific (mention dates, topics, exact things they said).
2. **check_in** — Based on an activity gap (e.g., haven't journaled in a while, haven't chatted in days).
3. **encouragement** — Celebrate a streak, milestone, or pattern of showing up consistently.
4. **exercise** — Recommend a specific relationship exercise based on what they've been working on. Exercises available: Soft Startup, Repair Checklist, Dreams Within Conflict, Love Maps, Stress-Reducing Conversation, Aftermath of a Fight, I-Statement Practice, Four Horsemen Antidotes, Appreciation Practice, Emotional Bid Recognition, Boundary Setting Script, Active Listening Drill.
5. **reflection** — Prompt them to revisit something from their journal and reflect on whether anything has shifted.

Return a JSON array of 1-3 nudges. Each nudge:
{
  "type": "follow_up" | "check_in" | "encouragement" | "exercise" | "reflection",
  "title": "Short catchy title (3-6 words)",
  "content": "Warm, specific 1-2 sentences. Use contractions, keep it conversational like a good friend texting. Reference actual things they said/wrote when possible.",
  "context": "Brief internal note about why this nudge was generated",
  "action_type": "chat" | "journal" | "exercise" | "partner" | null,
  "action_label": "Button text like 'Talk to coach' or 'Write in journal' or null",
  "action_url": "/ or /journal or /exercises or /partner or null"
}

Rules:
- NEVER be generic. Always reference specific content from their messages or journal.
- If there's not much data, lean toward a check_in or encouragement nudge.
- Keep the tone warm, brief, texting-style. Like a thoughtful friend, not a therapist.
- Don't repeat nudge types that were already generated today.
- If user has a streak >= 3, consider an encouragement nudge.
- If days since journal > 2, consider a check_in about journaling.
- Return ONLY the JSON array, no markdown fences, no extra text.`;

    const userContent = `Here is the user's recent activity:

=== RECENT CONVERSATIONS ===
${messageTranscript || "(No messages yet)"}

=== RECENT JOURNAL ENTRIES ===
${journalTranscript || "(No journal entries yet)"}

Generate 1-3 personalized nudges for today.`;

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const msg = response.choices[0]?.message;
    const raw = (
      msg?.content ||
      (msg as unknown as { reasoning: string })?.reasoning ||
      "[]"
    ).trim();

    // Extract JSON from response
    let jsonStr = raw;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    if (!jsonStr.startsWith("[") && !jsonStr.startsWith("{")) {
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrMatch) jsonStr = arrMatch[0];
    }

    let nudges: NudgePayload[];
    try {
      nudges = JSON.parse(jsonStr);
    } catch {
      console.error("[nudges] Failed to parse AI response:", raw);
      return Response.json(
        { error: "Failed to parse nudges" },
        { status: 500 }
      );
    }

    // Validate and sanitize nudges
    const validTypes = [
      "follow_up",
      "check_in",
      "encouragement",
      "exercise",
      "reflection",
    ];
    const validActionTypes = ["chat", "journal", "exercise", "partner", null];

    nudges = nudges
      .filter(
        (n) =>
          validTypes.includes(n.type) &&
          n.title &&
          n.content
      )
      .map((n) => ({
        ...n,
        action_type: validActionTypes.includes(n.action_type)
          ? n.action_type
          : null,
      }));

    return Response.json({ nudges });
  } catch (err) {
    console.error("[nudges] Error:", err);
    return Response.json(
      { error: "Failed to generate nudges" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { nudgeId, action } = (await request.json()) as {
      nudgeId: string;
      action: "read" | "dismiss";
    };

    if (!nudgeId || !["read", "dismiss"].includes(action)) {
      return Response.json(
        { error: "nudgeId and action (read|dismiss) are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData =
      action === "read"
        ? { is_read: true }
        : { is_dismissed: true };

    const { error } = await supabase
      .from("nudges")
      .update(updateData)
      .eq("id", nudgeId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[nudges] Update failed:", error.message);
      return Response.json(
        { error: "Failed to update nudge" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[nudges] PATCH error:", err);
    return Response.json(
      { error: "Failed to update nudge" },
      { status: 500 }
    );
  }
}
