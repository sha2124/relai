import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "anthropic/claude-sonnet-4";

interface MessageInput {
  role: string;
  content: string;
}

interface DetectedCommitment {
  text: string;
  context: string;
  urgency: "low" | "medium" | "high";
  suggested_follow_up: string;
}

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as {
      messages: MessageInput[];
    };

    if (!messages || messages.length === 0) {
      return Response.json({ commitments: [] });
    }

    const transcript = messages
      .slice(-40)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are an expert at detecting commitments, intentions, and action items from relationship coaching conversations.

Scan the conversation transcript and identify any commitments the user has made. Look for:
- "I'll try...", "I'm going to...", "This week I want to..."
- "I promised...", "I need to talk to..."
- "Next time I'll...", "I should..."
- Agreed-upon actions from coaching (e.g., "try the soft startup", "do the appreciation exercise")
- Any concrete intention to do something differently in their relationship

For each commitment found, return:
{
  "text": "A concise summary of what they committed to (1 sentence)",
  "context": "Brief context about why — what was the conversation about (1-2 sentences)",
  "urgency": "low" | "medium" | "high",
  "suggested_follow_up": "A warm, specific question to ask in 48 hours to check how it went (1 sentence)"
}

Rules:
- Only detect genuine commitments/intentions, not vague wishes
- Keep the suggested_follow_up warm, curious, and non-judgmental
- If no commitments are found, return an empty array
- Return ONLY a JSON array, no markdown fences, no extra text
- Maximum 5 commitments per scan`;

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Scan this conversation for commitments:\n\n${transcript}`,
        },
      ],
    });

    const msg = response.choices[0]?.message;
    const raw = (
      msg?.content ||
      (msg as unknown as { reasoning: string })?.reasoning ||
      "[]"
    ).trim();

    // Extract JSON
    let jsonStr = raw;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    if (!jsonStr.startsWith("[") && !jsonStr.startsWith("{")) {
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrMatch) jsonStr = arrMatch[0];
    }

    let commitments: DetectedCommitment[];
    try {
      commitments = JSON.parse(jsonStr);
    } catch {
      console.error("[check-in] Failed to parse AI response:", raw);
      return Response.json({ commitments: [] });
    }

    // Validate
    commitments = commitments
      .filter((c) => c.text && c.suggested_follow_up)
      .slice(0, 5);

    return Response.json({ commitments });
  } catch (err) {
    console.error("[check-in] POST error:", err);
    return Response.json(
      { error: "Failed to scan for commitments" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { commitmentId, status, outcome } = (await request.json()) as {
      commitmentId: string;
      status: "followed_up" | "completed" | "skipped" | "pending";
      outcome?: string;
    };

    if (!commitmentId || !status) {
      return Response.json(
        { error: "commitmentId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "followed_up", "completed", "skipped"];
    if (!validStatuses.includes(status)) {
      return Response.json(
        { error: "Invalid status" },
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

    const updateData: Record<string, unknown> = { status };
    if (outcome) updateData.outcome = outcome;
    if (status === "pending") {
      // Extend follow_up_at by 48 hours from now
      updateData.follow_up_at = new Date(
        Date.now() + 48 * 60 * 60 * 1000
      ).toISOString();
    }

    const { error } = await supabase
      .from("commitments")
      .update(updateData)
      .eq("id", commitmentId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[check-in] Update failed:", error.message);
      return Response.json(
        { error: "Failed to update commitment" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[check-in] PATCH error:", err);
    return Response.json(
      { error: "Failed to update commitment" },
      { status: 500 }
    );
  }
}
