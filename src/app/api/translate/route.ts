import OpenAI from "openai";

function getClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

const MODEL = "anthropic/claude-sonnet-4";

interface TranslateRequest {
  original: string;
  context: "sending" | "received";
  userProfile?: string;
}

interface Change {
  original_phrase: string;
  new_phrase: string;
  reason: string;
  category: string;
}

interface TranslateResponse {
  translated: string;
  changes: Change[];
}

const SYSTEM_PROMPT_SENDING = `You are an expert in Nonviolent Communication (NVC) and the Gottman Method. Your job is to take a heated, emotionally charged message someone is about to send to their partner and rewrite it using NVC principles.

RULES:
1. Rewrite the message using the NVC framework: Observation (what happened, without judgment) → Feeling (how it makes them feel) → Need (the underlying need) → Request (a specific, doable ask).
2. Keep the person's authentic voice — don't make it sound like a therapy textbook. Match their tone but remove the venom.
3. Preserve the core meaning and emotional truth. Don't minimize what they feel.
4. Remove: blame language, "you always/never" generalizations, mind-reading ("you don't even care"), contempt, sarcasm, and demands.
5. Replace with: "I" statements, specific observations, feeling words, named needs, and gentle requests.

You MUST respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.

Response format:
{
  "translated": "The full rewritten message",
  "changes": [
    {
      "original_phrase": "exact phrase from the original",
      "new_phrase": "what it became in the translation",
      "reason": "Brief, human explanation of why this changed (1 sentence)",
      "category": "one of: blame, criticism, contempt, defensiveness, demand, generalization, mind-reading"
    }
  ]
}

Include 2-6 changes. Focus on the most impactful transformations.`;

const SYSTEM_PROMPT_RECEIVED = `You are an expert in Nonviolent Communication (NVC) and the Gottman Method. Someone received a heated message from their partner and wants to understand what's really going on underneath the anger.

Your job is to translate the message to reveal the feelings and needs hiding behind the harsh words.

RULES:
1. Rewrite the message as what the partner is probably trying to say underneath: their real feelings, unmet needs, and what they're actually asking for.
2. Be compassionate toward the sender — assume they're struggling to express something real.
3. Don't excuse harmful behavior, but do humanize it. Help the reader see their partner's pain.
4. Frame it as "What they said → What they might mean."
5. Keep it warm and grounded, not clinical.

You MUST respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.

Response format:
{
  "translated": "The full rewritten message — what they might actually be trying to say",
  "changes": [
    {
      "original_phrase": "exact phrase from the original",
      "new_phrase": "what they probably mean underneath",
      "reason": "Brief explanation of the emotional logic (1 sentence)",
      "category": "one of: blame, criticism, contempt, defensiveness, demand, generalization, mind-reading"
    }
  ]
}

Include 2-6 changes. Focus on the most impactful translations.`;

export async function POST(request: Request) {
  try {
    const body: TranslateRequest = await request.json();

    if (!body.original || !body.original.trim()) {
      return Response.json(
        { error: "Message text is required" },
        { status: 400 }
      );
    }

    if (!body.context || !["sending", "received"].includes(body.context)) {
      return Response.json(
        { error: "Context must be 'sending' or 'received'" },
        { status: 400 }
      );
    }

    const systemPrompt =
      body.context === "sending"
        ? SYSTEM_PROMPT_SENDING
        : SYSTEM_PROMPT_RECEIVED;

    const userMessage = body.userProfile
      ? `Context about the user: ${body.userProfile}\n\nMessage to translate:\n"${body.original}"`
      : `Message to translate:\n"${body.original}"`;

    const completion = await getClient().chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const message = completion.choices[0]?.message;
    // Kimi K2.5 sometimes puts the response in reasoning instead of content
    const raw = message?.content
      || (message as unknown as { reasoning: string })?.reasoning
      || null;

    if (!raw) {
      return Response.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    // Parse JSON — extract from markdown fences or find JSON object in text
    let jsonStr = raw.trim();
    // Strip markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }
    // If still not valid JSON, try to find a JSON object in the text
    if (!jsonStr.startsWith("{")) {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    let parsed: TranslateResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("[translate] Failed to parse AI response:", raw);
      return Response.json(
        { error: "Failed to parse translation. Please try again." },
        { status: 502 }
      );
    }

    // Validate shape
    if (!parsed.translated || !Array.isArray(parsed.changes)) {
      return Response.json(
        { error: "Invalid response format. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("[translate] Error:", err);
    return Response.json(
      { error: "Failed to translate message" },
      { status: 500 }
    );
  }
}
