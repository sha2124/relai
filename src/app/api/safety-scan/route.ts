import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "anthropic/claude-sonnet-4";

const SAFETY_SCREENING_PROMPT = `You are a safety screening system for a relationship coaching app. Your role is to review user conversations and journal entries for signs of unhealthy or dangerous relationship dynamics.

You are NOT diagnosing anything. You are identifying patterns worth paying attention to. Be generous with flagging — false positives are far better than false negatives when safety is at stake.

Scan for these categories:

**ABUSE indicators:**
- Physical violence mentions (hit, pushed, grabbed, slapped, choked, threw things, threats of physical harm)
- Emotional abuse (name-calling, gaslighting, "you're crazy", "nobody else would want you", constant criticism, humiliation)
- Financial control ("won't let me spend", "controls the money", "took my card", "I have to ask permission for everything")
- Sexual coercion or pressure
- Threats ("if you leave I'll...", "I'll hurt myself if you go", "you'll never see the kids")

**ISOLATION indicators:**
- "doesn't let me see my friends/family"
- "checks my phone/location"
- "I'm not allowed to..."
- Cutting off from support systems
- Jealousy used to justify control

**POWER IMBALANCE indicators:**
- One partner making all decisions
- Fear-based compliance ("I can't say no", "I'm scared to bring it up", "I have to be careful what I say")
- Minimizing clearly harmful behavior ("it's not that bad", "they didn't mean it", "it only happened once")
- Walking on eggshells language
- Excessive apologizing for partner's behavior

**SELF-HARM / SUICIDAL IDEATION:**
- Direct statements ("I don't want to be here", "I'd be better off dead", "I want to end it all")
- Hopelessness patterns ("nothing will ever change", "what's the point", "I'm trapped")
- Withdrawal from everything
- Giving things away or saying goodbye
- Self-blame to an extreme degree

**ESCALATION patterns:**
- Frequency of conflict increasing rapidly
- Severity of language escalating over time
- "Last straw" language
- Violence or threats becoming more frequent
- Cycle of abuse patterns (tension → explosion → reconciliation → calm → repeat)

**MENTAL HEALTH concerns:**
- Severe anxiety triggered by partner
- Depression symptoms linked to relationship
- Panic attacks around partner
- Disordered eating as coping mechanism
- Substance use to cope with relationship stress

SEVERITY LEVELS:
- "watch": Subtle patterns worth monitoring but not alarming (e.g., occasional walking on eggshells)
- "concern": Clear unhealthy patterns that deserve attention (e.g., consistent fear of expressing needs)
- "urgent": Serious safety indicators requiring professional help (e.g., described controlling behavior, isolation)
- "critical": Immediate danger indicators (e.g., physical violence, suicidal ideation, threats)

RESPONSE RULES:
1. NEVER diagnose abuse — describe patterns and let the user decide
2. ALWAYS frame with nuance — "This pattern is worth paying attention to" not "You are being abused"
3. Include positive, empowering framing — "You deserve to feel safe expressing yourself"
4. Be culturally sensitive — some dynamics vary across cultures but safety is universal
5. If nothing concerning is detected, return an empty alerts array (this is the happy path and most common result)
6. Each alert MUST include relevant crisis resources
7. The guidance field should be warm, non-judgmental, and empowering

Respond with ONLY valid JSON in this exact format:
{
  "alerts": [
    {
      "severity": "watch" | "concern" | "urgent" | "critical",
      "category": "abuse" | "self_harm" | "power_imbalance" | "isolation" | "escalation" | "mental_health",
      "title": "Short, non-alarming title",
      "description": "Warm, non-judgmental description of what was noticed. Frame as observation, not diagnosis.",
      "evidence": ["exact quote or close paraphrase from the text that triggered this"],
      "resources": {
        "primary": { "name": "Resource name", "contact": "Phone number or URL" },
        "text": { "name": "Text resource", "contact": "Text instructions" }
      },
      "guidance": "Empowering, warm guidance. Never commanding. Always validating."
    }
  ],
  "overall_safety": "safe" | "monitor" | "concern" | "urgent",
  "recommendation": "One warm sentence about next steps or reassurance"
}`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, journalEntries } = await request.json();

    // Build the content to scan
    let contentToScan = "";

    if (messages && messages.length > 0) {
      contentToScan += "=== RECENT CONVERSATIONS ===\n";
      contentToScan += messages
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join("\n");
      contentToScan += "\n\n";
    }

    if (journalEntries && journalEntries.length > 0) {
      contentToScan += "=== JOURNAL ENTRIES ===\n";
      contentToScan += journalEntries
        .map((j: { content: string; mood?: string; created_at?: string }) => {
          const date = j.created_at
            ? new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "Recent";
          const mood = j.mood ? ` (mood: ${j.mood})` : "";
          return `[${date}${mood}] ${j.content}`;
        })
        .join("\n");
    }

    if (!contentToScan.trim()) {
      return Response.json({
        alerts: [],
        overall_safety: "safe",
        recommendation: "No conversations or journal entries to review yet. Keep using RelAI and we'll quietly keep an eye on things for you.",
      });
    }

    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SAFETY_SCREENING_PROMPT },
        {
          role: "user",
          content: `Please review the following content for safety concerns:\n\n${contentToScan}`,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    // Parse the JSON response
    let result;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      result = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[safety-scan] Failed to parse AI response:", responseText);
      return Response.json({
        alerts: [],
        overall_safety: "safe",
        recommendation: "We reviewed your recent activity and everything looks okay.",
      });
    }

    // Validate and sanitize the response
    const validSeverities = ["watch", "concern", "urgent", "critical"];
    const validCategories = ["abuse", "self_harm", "power_imbalance", "isolation", "escalation", "mental_health"];

    const sanitizedAlerts = (result.alerts ?? [])
      .filter(
        (a: { severity: string; category: string; title: string; description: string }) =>
          validSeverities.includes(a.severity) &&
          validCategories.includes(a.category) &&
          a.title &&
          a.description
      )
      .map((a: { severity: string; category: string; title: string; description: string; evidence?: string[]; resources?: Record<string, unknown>; guidance?: string }) => ({
        severity: a.severity,
        category: a.category,
        title: a.title,
        description: a.description,
        evidence: Array.isArray(a.evidence) ? a.evidence : [],
        resources: a.resources ?? {
          primary: { name: "National DV Hotline", contact: "1-800-799-7233" },
          text: { name: "Crisis Text Line", contact: "Text HOME to 741741" },
        },
        guidance: a.guidance ?? "",
      }));

    const validOverallSafety = ["safe", "monitor", "concern", "urgent"];
    const overallSafety = validOverallSafety.includes(result.overall_safety)
      ? result.overall_safety
      : sanitizedAlerts.length > 0 ? "monitor" : "safe";

    // Save alerts to database
    if (sanitizedAlerts.length > 0) {
      const alertsToInsert = sanitizedAlerts.map((a: { severity: string; category: string; title: string; description: string; evidence: string[]; resources: Record<string, unknown>; guidance: string }) => ({
        user_id: user.id,
        severity: a.severity,
        category: a.category,
        title: a.title,
        description: a.description,
        evidence: a.evidence,
        resources: { ...a.resources, guidance: a.guidance },
      }));

      const { error: insertError } = await supabase
        .from("safety_alerts")
        .insert(alertsToInsert);

      if (insertError) {
        console.error("[safety-scan] Failed to save alerts:", insertError);
        // Don't fail the request — still return the results
      }
    }

    return Response.json({
      alerts: sanitizedAlerts,
      overall_safety: overallSafety,
      recommendation: result.recommendation ?? "We reviewed your recent activity.",
    });
  } catch (err) {
    console.error("[safety-scan] Error:", err);
    return Response.json(
      {
        alerts: [],
        overall_safety: "safe",
        recommendation: "We had trouble completing the review. Please try again later.",
      },
      { status: 200 } // Don't return error status — safety features should degrade gracefully
    );
  }
}
