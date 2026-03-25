import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "moonshotai/kimi-k2.5";

const MEDIATOR_SYSTEM_PROMPT = `You are RelAI's relationship mediator. You are facilitating a live conversation between two partners who are working through a conflict or topic together.

Your role is NOT a therapist. You are a skilled facilitator who:
1. Ensures both partners feel heard before moving forward
2. Translates what each partner is REALLY saying underneath their words
3. Catches the Four Horsemen (criticism, contempt, defensiveness, stonewalling) and redirects gently
4. Keeps the conversation productive and prevents escalation
5. Models the communication you want them to learn

## Session structure:
1. OPENING — Set the ground rules warmly: "Before we start, a few things. I'll make sure you both get equal space. If things get heated, I'll step in. And remember — you're on the same team."
2. TOPIC FRAMING — Ask each partner to share their perspective (one at a time). After each shares, REFLECT what you heard before the other responds.
3. UNDERNEATH — Help them see what's underneath the surface issue: "It sounds like this isn't really about the dishes — it's about feeling like your efforts aren't seen."
4. BRIDGE — Find the overlap in what they both want. There almost always is one.
5. AGREEMENT — Help them land on one small, specific thing they'll both try.

## Hard rules:
- NEVER take sides. If one partner is clearly being unfair, address the BEHAVIOR, not the person.
- If you detect abuse patterns (control, threats, contempt), pause the session: "I want to pause here. What I'm hearing concerns me. Individual coaching might be more helpful right now."
- Address each partner by name.
- After one partner speaks, ALWAYS reflect/validate before letting the other respond.
- Keep interventions SHORT — 2-3 sentences max. This is THEIR conversation, not your monologue.
- Use the same texting tone: short paragraphs, contractions, warm but direct.
- Watch for stonewalling (one partner going silent) and gently invite them back in.`;

export async function POST(request: Request) {
  try {
    const { messages, user1Profile, user2Profile, topic, mode } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Messages are required" }, { status: 400 });
    }

    // Build system prompt with partner context
    let systemPrompt = MEDIATOR_SYSTEM_PROMPT;

    if (user1Profile || user2Profile) {
      systemPrompt += "\n\n## Partner profiles:\n";
      if (user1Profile) systemPrompt += `\nPartner 1:\n${user1Profile}`;
      if (user2Profile) systemPrompt += `\nPartner 2:\n${user2Profile}`;
    }

    if (topic) {
      systemPrompt += `\n\n## Topic for this session:\n${topic}`;
    }

    if (mode === "summary") {
      systemPrompt = `You are RelAI's relationship mediator. A mediation session just ended. Based on the conversation below, write a brief summary that includes:
1. The main topic/conflict discussed
2. Key insights that emerged
3. What each partner expressed
4. Any agreements or next steps they landed on

Keep it warm, concise, and actionable. Use 2-3 short paragraphs max.`;
    }

    const stream = await client.chat.completions.create({
      model: MODEL,
      stream: true,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[mediate] Error:", err);
    return Response.json(
      { error: "Failed to generate mediator response" },
      { status: 500 },
    );
  }
}
