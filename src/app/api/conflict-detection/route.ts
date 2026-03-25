import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "anthropic/claude-sonnet-4";

interface MessageData {
  role: string;
  content: string;
  created_at: string;
}

interface JournalData {
  content: string;
  mood: string | null;
  tags: string[] | null;
  created_at: string;
}

export async function POST(request: Request) {
  try {
    const { messages, journalEntries, userArchetype, partnerArchetype, partnerName } =
      (await request.json()) as {
        messages: MessageData[];
        journalEntries: JournalData[];
        userArchetype: string;
        partnerArchetype: string;
        partnerName: string;
      };

    if (!messages && !journalEntries) {
      return Response.json(
        { error: "Messages or journal entries are required" },
        { status: 400 }
      );
    }

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

    const systemPrompt = `You are a relationship conflict pattern analyst for RelAI, an AI relationship coach grounded in Gottman Method, attachment theory, and Nonviolent Communication (NVC).

You will analyze a user's chat history with their AI coach and journal entries to detect recurring conflict patterns, trigger-response cycles, and escalation dynamics in their relationship.

The user's relationship archetype: ${userArchetype}
Their partner's archetype: ${partnerArchetype}
Partner's name: ${partnerName || "their partner"}

Your analysis should be based on Gottman's "Four Horsemen of the Apocalypse" framework:
1. **Criticism** — Attacking character rather than behavior ("You always..." / "You never...")
2. **Contempt** — Superiority, mockery, eye-rolling, name-calling
3. **Defensiveness** — Deflecting responsibility, counter-attacking, playing victim
4. **Stonewalling** — Shutting down, withdrawing, going silent, refusing to engage

Return a JSON object (not wrapped in markdown fences) with this exact structure:
{
  "escalation_score": <number 0-100, where 0 is very calm conflict style and 100 is highly escalating>,
  "four_horsemen": {
    "criticism": {
      "count": <number of instances detected>,
      "examples": ["quoted or paraphrased examples from their messages"],
      "antidote": "Specific actionable advice to counter this pattern"
    },
    "contempt": {
      "count": <number>,
      "examples": [],
      "antidote": "Specific actionable advice"
    },
    "defensiveness": {
      "count": <number>,
      "examples": [],
      "antidote": "Specific actionable advice"
    },
    "stonewalling": {
      "count": <number>,
      "examples": [],
      "antidote": "Specific actionable advice"
    }
  },
  "patterns": [
    {
      "name": "Short evocative name for the pattern",
      "description": "2-3 sentences describing what happens",
      "trigger": "What starts this cycle",
      "your_response": "How the user typically responds",
      "their_likely_response": "How the partner likely responds based on archetype and context",
      "cycle_effect": "What this does to the relationship over time",
      "break_strategy": "Specific, actionable advice to break this cycle"
    }
  ],
  "hot_topics": ["topic1", "topic2", "topic3"],
  "summary": "2-3 sentence warm, non-judgmental overview of their conflict landscape",
  "positive_note": "Something genuinely encouraging about their conflict style or growth"
}

Rules:
- Be warm and non-judgmental — frame everything as "patterns we notice" not "things wrong with you"
- Reference specific things from their actual messages/journal where possible
- If data is limited, use archetype-based predictions but note they're based on patterns, not observed behavior
- Provide 2-5 conflict patterns
- Provide 2-5 hot topics
- Keep examples brief — paraphrase rather than quoting entire messages
- The antidotes should be specific and actionable, not generic advice
- The positive note should be genuine and specific
- Return ONLY the JSON object, no markdown fences, no extra text`;

    const userContent = `Here is the user's data for conflict pattern analysis:

=== CONVERSATION HISTORY WITH AI COACH ===
${messageTranscript || "(No messages yet)"}

=== JOURNAL ENTRIES ===
${journalTranscript || "(No journal entries yet)"}

Analyze the conflict patterns, Four Horsemen indicators, escalation dynamics, and recurring hot topics. Return the JSON analysis.`;

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const msg = response.choices[0]?.message;
    const raw = (msg?.content || "{}").trim();

    // Extract JSON from response
    let jsonStr = raw;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error("[conflict-detection] Failed to parse AI response:", raw);
      return Response.json(
        { error: "Failed to parse conflict analysis" },
        { status: 500 }
      );
    }

    return Response.json({
      ...result,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[conflict-detection] Error:", err);
    return Response.json(
      { error: "Failed to generate conflict analysis" },
      { status: 500 }
    );
  }
}
