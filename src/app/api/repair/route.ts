import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "anthropic/claude-sonnet-4";

export async function POST(request: Request) {
  try {
    const { situation, myFeelings, theirFeelings, goal, myArchetype, partnerArchetype } =
      await request.json();

    if (!situation || !myFeelings?.length || !theirFeelings?.length || !goal) {
      return Response.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const archetypeContext = myArchetype
      ? `\n\nThe user's relationship archetype: "${myArchetype.name}" — ${myArchetype.tagline}. Strengths: ${myArchetype.strengths.join(", ")}. Blind spots: ${myArchetype.blindSpots.join(", ")}. Growth edge: ${myArchetype.growthEdge}${
          partnerArchetype
            ? `\n\nTheir partner's archetype: "${partnerArchetype.name}" — ${partnerArchetype.tagline}. Strengths: ${partnerArchetype.strengths.join(", ")}. Blind spots: ${partnerArchetype.blindSpots.join(", ")}. Growth edge: ${partnerArchetype.growthEdge}`
            : ""
        }`
      : "";

    const systemPrompt = `You are an expert relationship repair coach grounded in the Gottman repair checklist, attachment theory, and nonviolent communication. Your job is to generate a specific, personalized repair script — actual words the user can say to their partner after a fight or rupture.

Rules:
- The script must sound like a REAL PERSON talking, not a therapist. Use natural language, contractions, and imperfect sentences.
- Be specific to the situation described. Never give generic advice.
- The opening should be soft and non-threatening — a gentle bid for connection.
- The acknowledgment should name what the user did or contributed to the conflict honestly.
- The vulnerability section should reveal the feeling underneath the behavior.
- The request should be clear, specific, and non-demanding.
- Keep each section to 2-4 sentences max. These are things to actually say out loud.
- The grounding section is private — 2-3 sentences to help the user calm their nervous system before speaking.
- The expectations section should be honest about how the partner might react, especially if they're still activated.
- The fallback script is what to say if the partner isn't ready or reacts badly — graceful, non-blaming, leaving the door open.
${archetypeContext}

You MUST respond with valid JSON only, no markdown, no code fences. Use this exact structure:
{
  "grounding": "string — 2-3 sentences to ground yourself before speaking",
  "script": {
    "opening": "string — soft opening line to say",
    "acknowledgment": "string — owning your part",
    "vulnerability": "string — the feeling underneath",
    "request": "string — what you need from them"
  },
  "expectations": "string — what to expect from partner and how to handle it",
  "fallback": "string — what to say if it doesn't go well"
}`;

    const userMessage = `Situation: ${situation}

My feelings right now: ${myFeelings.join(", ")}
What I think my partner is feeling: ${theirFeelings.join(", ")}
What I want to happen: ${goal}`;

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const msg = response.choices[0]?.message;
    const raw = (msg?.content || (msg as unknown as { reasoning: string })?.reasoning || "").trim();

    // Extract JSON from response
    let jsonStr = raw;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    if (!jsonStr.startsWith("{")) {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("[repair] Failed to parse AI response:", raw);
      return Response.json(
        { error: "Failed to generate repair script. Please try again." },
        { status: 502 }
      );
    }

    // Validate shape
    if (
      !parsed.grounding ||
      !parsed.script?.opening ||
      !parsed.script?.acknowledgment ||
      !parsed.script?.vulnerability ||
      !parsed.script?.request ||
      !parsed.expectations ||
      !parsed.fallback
    ) {
      console.error("[repair] Incomplete response shape:", parsed);
      return Response.json(
        { error: "Incomplete response from AI. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("[repair] Error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
