import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "moonshotai/kimi-k2.5";

interface Message {
  role: string;
  content: string;
}

/**
 * Summarize older messages into a concise context paragraph.
 * Used to keep the AI's context window manageable while preserving memory.
 */
export async function summarizeMessages(messages: Message[]): Promise<string> {
  if (messages.length === 0) return "";

  const conversation = messages
    .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content: `You are a summarizer for a relationship coaching AI. Summarize the following conversation into a concise paragraph that captures:
- Key topics and concerns the user raised
- Important patterns or insights that emerged
- Any breakthroughs, commitments, or action items
- The emotional tone and where the user is at

Write in third person ("The user discussed..."). Be concise but preserve anything a coach would need to continue the conversation effectively. Do NOT include greetings or filler.`,
      },
      {
        role: "user",
        content: conversation,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
