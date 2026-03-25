import OpenAI from "openai";

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

export async function POST(request: Request) {
  try {
    const { messages, journalEntries, archetype, partnerLinked } =
      (await request.json()) as {
        messages: Message[];
        journalEntries: JournalEntry[];
        archetype?: string;
        partnerLinked?: boolean;
      };

    if (
      (!messages || messages.length === 0) &&
      (!journalEntries || journalEntries.length === 0)
    ) {
      return Response.json(
        { error: "No conversation or journal data to analyze" },
        { status: 400 }
      );
    }

    // Build condensed transcripts
    const messageTranscript = (messages ?? [])
      .map(
        (m) =>
          `[${new Date(m.created_at).toLocaleDateString()}] ${m.role}: ${m.content}`
      )
      .join("\n");

    const journalTranscript = (journalEntries ?? [])
      .map(
        (j) =>
          `[${new Date(j.created_at).toLocaleDateString()}] Journal (mood: ${j.mood ?? "unset"}, tags: ${j.tags?.join(", ") ?? "none"}): ${j.content}`
      )
      .join("\n");

    const systemPrompt = `You are a relationship health analyst for RelAI, an AI relationship coach app grounded in Gottman Method, attachment theory, and Nonviolent Communication (NVC).

You will receive a user's conversation history with their AI coach and their journal entries from the past week. Score 5 relationship dimensions from 0 to 100 each:

1. **Communication** — Quality of expressing needs, active listening patterns, clarity, openness
2. **Emotional Safety** — Vulnerability level, trust indicators, defensiveness patterns, emotional availability
3. **Conflict Resolution** — Repair attempts, Four Horsemen presence/absence, de-escalation skills, compromise
4. **Intimacy & Connection** — Emotional closeness, bids for connection, appreciation, quality time
5. **Growth & Effort** — Self-awareness, trying new skills, consistency, willingness to change

${archetype ? `The user's relationship archetype is: ${archetype}. Factor this into your scoring.` : ""}
${partnerLinked ? "The user has linked their partner in the app, which shows commitment to working on the relationship together." : ""}

Scoring guidelines:
- 0-30: Significant concerns, patterns need immediate attention
- 31-50: Struggles present, but awareness is growing
- 51-70: Solid foundation with clear areas for growth
- 71-100: Strong patterns, healthy behaviors evident

Return ONLY a valid JSON object (no markdown fences, no extra text) with this exact structure:
{
  "overall": <number 0-100, weighted average favoring lower dimensions>,
  "dimensions": {
    "communication": <number 0-100>,
    "emotional_safety": <number 0-100>,
    "conflict_resolution": <number 0-100>,
    "intimacy": <number 0-100>,
    "growth": <number 0-100>
  },
  "insights": "<2-3 sentence warm, encouraging summary of overall relationship health. Reference specific things from their messages/journal. Use second person (you/your).>",
  "tips": [
    "<Specific, actionable tip #1 based on their weakest dimension>",
    "<Specific, actionable tip #2 based on patterns you noticed>"
  ]
}

Rules:
- Be warm, encouraging, and specific — reference actual things they said when possible
- The overall score should lean toward lower dimensions (weakest link principle) but not be purely the minimum
- If data is sparse, score conservatively (40-60 range) and note limited data in insights
- Tips should be concrete actions they can take this week, not generic advice`;

    const userContent = `Here is the user's data from the past week to analyze:

=== CONVERSATION HISTORY ===
${messageTranscript || "(No messages yet)"}

=== JOURNAL ENTRIES ===
${journalTranscript || "(No journal entries yet)"}

Analyze this data and return the JSON health score object.`;

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
      "{}"
    ).trim();

    // Extract JSON from response
    let jsonStr = raw;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    if (!jsonStr.startsWith("{")) {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error("[health-score] Failed to parse AI response:", raw);
      return Response.json(
        { error: "Failed to parse health score" },
        { status: 500 }
      );
    }

    return Response.json({
      overall_score: Math.round(result.overall ?? 50),
      dimensions: result.dimensions ?? {
        communication: 50,
        emotional_safety: 50,
        conflict_resolution: 50,
        intimacy: 50,
        growth: 50,
      },
      insights: result.insights ?? "Keep sharing and journaling to get more accurate scores.",
      tips: result.tips ?? [
        "Try expressing one need clearly to your partner this week.",
        "Write in your journal about a positive moment in your relationship.",
      ],
    });
  } catch (err) {
    console.error("[health-score] Error:", err);
    return Response.json(
      { error: "Failed to generate health score" },
      { status: 500 }
    );
  }
}
