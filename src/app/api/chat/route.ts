import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { summarizeMessages } from "@/lib/summarize";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "moonshotai/kimi-k2.5";

// How many recent messages to send as full context
const RECENT_MESSAGE_COUNT = 20;

export async function POST(request: Request) {
  try {
    const { messages, userProfile, conversationSummary, journalContext } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required" }, { status: 400 });
    }

    // If we have more messages than the threshold, summarize older ones
    let summary = conversationSummary ?? "";
    let recentMessages = messages;

    if (messages.length > RECENT_MESSAGE_COUNT) {
      const olderMessages = messages.slice(0, messages.length - RECENT_MESSAGE_COUNT);
      recentMessages = messages.slice(messages.length - RECENT_MESSAGE_COUNT);

      try {
        const olderSummary = await summarizeMessages(olderMessages);
        summary = summary
          ? `${summary}\n\nMore recent context: ${olderSummary}`
          : olderSummary;
      } catch (err) {
        console.error("[chat] Summary error (continuing without):", err);
        // Fall back to just using recent messages without summary
      }
    }

    const systemPrompt = buildSystemPrompt(userProfile, summary, journalContext);

    const stream = await client.chat.completions.create({
      model: MODEL,
      stream: true,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages.map((m: { role: string; content: string }) => ({
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
    console.error("[chat] Error:", err);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
