import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "moonshotai/kimi-k2.5";

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
    const { messages, journalEntries, archetype } = (await request.json()) as {
      messages: Message[];
      journalEntries: JournalEntry[];
      archetype?: string;
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

    // Build a condensed transcript for the AI
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

    const systemPrompt = `You are a relationship pattern analyst for RelAI, an AI relationship coach app grounded in Gottman Method, attachment theory, and Nonviolent Communication (NVC).

You will receive a user's conversation history with their AI coach and their journal entries. Analyze everything for recurring patterns, emotional cycles, growth moments, blind spots, and any signs of the Four Horsemen of the Apocalypse (criticism, contempt, defensiveness, stonewalling).

${archetype ? `The user's relationship archetype is: ${archetype}. Factor this into your analysis.` : ""}

Return a JSON array of 5-7 insights. Each insight must be one of these types:

1. **theme** — A topic or concern that keeps coming up
2. **pattern** — An emotional trigger → response cycle you notice
3. **growth** — A concrete moment of progress (compare earlier vs. later statements)
4. **blind_spot** — Something important they seem to be avoiding or haven't mentioned in a while
5. **horseman** — A Four Horsemen pattern (criticism, contempt, defensiveness, stonewalling)

Each insight object must have:
{
  "type": "theme" | "pattern" | "growth" | "blind_spot" | "horseman",
  "title": "Short, warm title (not clinical)",
  "description": "1-2 sentence explanation in second person (you/your)",
  "evidence": ["Direct quote or paraphrase from their messages/journal, with approximate date"],
  "severity": "low" | "medium" | "high",
  "suggestion": "One actionable, gentle suggestion"
}

Rules:
- Be specific — reference actual things they said, with dates when possible
- Be warm and encouraging, not clinical or judgmental
- Always include at least 1-2 growth moments (positive insights) alongside any concerns
- For horseman insights, name the specific horseman and provide its antidote
- Prioritize insights that would be most useful for the person's growth
- Keep evidence quotes concise but recognizable
- Return ONLY the JSON array, no markdown fences, no extra text`;

    const userContent = `Here is the user's data to analyze:

=== CONVERSATION HISTORY ===
${messageTranscript || "(No messages yet)"}

=== JOURNAL ENTRIES ===
${journalTranscript || "(No journal entries yet)"}

Analyze this data and return a JSON array of 5-7 insights.`;

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const msg = response.choices[0]?.message;
    const raw = (msg?.content || (msg as unknown as { reasoning: string })?.reasoning || "[]").trim();

    // Extract JSON from response
    let jsonStr = raw;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    if (!jsonStr.startsWith("[") && !jsonStr.startsWith("{")) {
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrMatch) jsonStr = arrMatch[0];
    }

    let insights;
    try {
      insights = JSON.parse(jsonStr);
    } catch {
      console.error("[insights] Failed to parse AI response:", raw);
      return Response.json(
        { error: "Failed to parse insights" },
        { status: 500 }
      );
    }

    return Response.json({
      insights,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[insights] Error:", err);
    return Response.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
