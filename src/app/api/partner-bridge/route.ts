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

interface PartnerData {
  name: string;
  archetype: string;
  messages: MessageData[];
  journalEntries: JournalData[];
}

export async function POST(request: Request) {
  try {
    const { user1, user2 } = (await request.json()) as {
      user1: PartnerData;
      user2: PartnerData;
    };

    if (!user1 || !user2) {
      return Response.json(
        { error: "Both partners' data is required" },
        { status: 400 }
      );
    }

    // Build transcripts for user1
    const user1Messages = (user1.messages ?? [])
      .map(
        (m) =>
          `[${new Date(m.created_at).toLocaleDateString()}] ${m.role}: ${m.content}`
      )
      .join("\n");

    const user1Journal = (user1.journalEntries ?? [])
      .map(
        (j) =>
          `[${new Date(j.created_at).toLocaleDateString()}] Journal (mood: ${j.mood ?? "unset"}, tags: ${j.tags?.join(", ") ?? "none"}): ${j.content}`
      )
      .join("\n");

    // Build transcripts for user2
    const user2Messages = (user2.messages ?? [])
      .map(
        (m) =>
          `[${new Date(m.created_at).toLocaleDateString()}] ${m.role}: ${m.content}`
      )
      .join("\n");

    const user2Journal = (user2.journalEntries ?? [])
      .map(
        (j) =>
          `[${new Date(j.created_at).toLocaleDateString()}] Journal (mood: ${j.mood ?? "unset"}, tags: ${j.tags?.join(", ") ?? "none"}): ${j.content}`
      )
      .join("\n");

    const systemPrompt = `You are a relationship dynamics analyst for RelAI, an AI relationship coach grounded in Gottman Method, attachment theory, and Nonviolent Communication (NVC).

You will receive data from BOTH partners in a relationship — their chat history with their AI coach, journal entries, and relationship archetypes. Analyze their combined data to surface shared patterns, complementary strengths, tension points, and growth opportunities as a couple.

Partner 1: ${user1.name} (Archetype: ${user1.archetype})
Partner 2: ${user2.name} (Archetype: ${user2.archetype})

Return a JSON object (not wrapped in markdown fences) with this structure:
{
  "compatibility_score": <number 0-100>,
  "dynamics": [
    {
      "type": "strength" | "tension" | "growth" | "pattern" | "complement",
      "title": "Short warm title",
      "description": "2-3 sentences about this dynamic between the couple",
      "for_partner1": "Specific insight or suggestion for ${user1.name}",
      "for_partner2": "Specific insight or suggestion for ${user2.name}",
      "evidence": "What in the data points to this"
    }
  ],
  "summary": "2-3 sentence overview of the couple's dynamic",
  "next_conversation": "One specific conversation starter they should have together"
}

Analysis should cover:
- **Strengths** — what they do well together based on their combined archetypes and chat patterns
- **Tensions** — where their attachment/communication styles create friction
- **Complements** — how their differences can actually help each other
- **Patterns** — recurring dynamics visible across both their conversations (e.g., pursue-withdraw, parallel play)
- **Growth opportunities** — areas where both could grow that would benefit the relationship

Rules:
- Reference specific things from their actual messages/journal where possible
- Be warm and encouraging — this should feel like a gift, not a report card
- The compatibility score is NOT a prediction of success — it represents current alignment and how well they are attuned to each other right now
- Always include at least 2 strengths alongside any tensions
- Use both partners' names (${user1.name} and ${user2.name})
- Provide 5-8 insights total
- If one partner has limited data, focus more on archetype-based analysis and note that deeper insights come with more data
- Return ONLY the JSON object, no markdown fences, no extra text`;

    const userContent = `Here is both partners' data:

=== ${user1.name}'s CONVERSATION HISTORY ===
${user1Messages || "(No messages yet)"}

=== ${user1.name}'s JOURNAL ENTRIES ===
${user1Journal || "(No journal entries yet)"}

=== ${user2.name}'s CONVERSATION HISTORY ===
${user2Messages || "(No messages yet)"}

=== ${user2.name}'s JOURNAL ENTRIES ===
${user2Journal || "(No journal entries yet)"}

Analyze both partners' data together and return a JSON object with compatibility_score, dynamics array (5-8 insights), summary, and next_conversation.`;

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
      console.error("[partner-bridge] Failed to parse AI response:", raw);
      return Response.json(
        { error: "Failed to parse couple insights" },
        { status: 500 }
      );
    }

    return Response.json({
      ...result,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[partner-bridge] Error:", err);
    return Response.json(
      { error: "Failed to generate couple insights" },
      { status: 500 }
    );
  }
}
