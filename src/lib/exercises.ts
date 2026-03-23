/**
 * Guided Exercise Library
 *
 * Evidence-based relationship exercises organized by category.
 * Each exercise includes a description, steps, and the research behind it.
 */

export interface Exercise {
  id: string;
  name: string;
  tagline: string;
  description: string;
  duration: string;
  category: "communication" | "conflict" | "connection" | "self-awareness" | "repair";
  difficulty: "starter" | "intermediate" | "deep";
  steps: string[];
  source: string;
  emoji: string;
  chatPrompt: string; // What to send to the AI coach to start this exercise
}

export const EXERCISES: Exercise[] = [
  // ── Communication ──
  {
    id: "soft-startup",
    name: "Soft Startup",
    tagline: "Raise an issue without starting a fight",
    description:
      "Research shows the first 3 minutes of a conversation predict how it ends. This exercise helps you bring up difficult topics gently using the 'I feel... about... and I need...' formula.",
    duration: "10 min",
    category: "communication",
    difficulty: "starter",
    steps: [
      "Think of something that's been bothering you in your relationship.",
      "Write it down as a complaint: how you'd normally say it.",
      "Now rewrite it using: 'I feel [emotion] about [specific situation] and I need [specific request].'",
      "Read both versions out loud. Notice the difference.",
      "Practice saying the soft version until it feels natural.",
    ],
    source: "Gottman Method — The Magic of Soft Startups",
    emoji: "🌱",
    chatPrompt:
      "I want to practice a soft startup. I have something I need to bring up with my partner but I don't want it to turn into a fight. Can you help me rewrite my complaint as a gentle request?",
  },
  {
    id: "repair-checklist",
    name: "Repair Checklist",
    tagline: "Fix a rupture before it becomes a wound",
    description:
      "Every couple fights. What separates thriving couples from struggling ones is how quickly they repair. This exercise gives you concrete phrases to de-escalate and reconnect after conflict.",
    duration: "5 min",
    category: "repair",
    difficulty: "starter",
    steps: [
      "Think of a recent argument that didn't resolve well.",
      "Choose a repair phrase that fits: 'Can we start over?', 'I didn't mean it that way', 'You're right, I'm sorry', 'Can I take that back?'",
      "Practice saying it out loud — notice how it feels.",
      "Plan when you'll actually use it (the sooner, the better).",
      "After you try it, notice your partner's response.",
    ],
    source: "Gottman Method — Repair Attempts",
    emoji: "🩹",
    chatPrompt:
      "I want to work on repairing after arguments. We had a fight recently and I don't know how to bridge the gap. Can you help me find the right repair attempt?",
  },
  {
    id: "dreams-within-conflict",
    name: "Dreams Within Conflict",
    tagline: "Find what your recurring fight is really about",
    description:
      "69% of relationship conflicts are perpetual — they never get 'solved.' This exercise helps you discover the deeper dreams, values, and life stories underneath your gridlocked disagreements.",
    duration: "20 min",
    category: "conflict",
    difficulty: "deep",
    steps: [
      "Pick a recurring argument you and your partner keep having.",
      "Ask yourself: 'What does this issue mean to me? Why does it matter so much?'",
      "Trace it back: does this connect to a childhood experience, a value, or a dream for your life?",
      "Write down what you'd want your partner to understand about why this matters.",
      "Now imagine their side: what might their dream or value be?",
      "The goal isn't to solve it — it's to understand each other's deeper story.",
    ],
    source: "Gottman Method — Dreams Within Conflict",
    emoji: "💭",
    chatPrompt:
      "My partner and I keep having the same argument and I want to understand what's really underneath it. Can you help me explore the dreams within this conflict?",
  },
  {
    id: "the-real-question",
    name: "The Real Question",
    tagline: "Find the question underneath the question",
    description:
      "According to Dr. Sue Johnson, every relationship fight is really asking one question: 'Are you there for me?' This exercise helps you identify the real emotional need hiding behind the surface-level complaint.",
    duration: "10 min",
    category: "self-awareness",
    difficulty: "intermediate",
    steps: [
      "Think of the last time you got upset with your partner.",
      "What were you arguing about on the surface?",
      "Now go deeper: were you really asking 'Do you care?', 'Am I important to you?', or 'Can I count on you?'",
      "Rewrite what you said as the real question underneath.",
      "Notice how different it feels to lead with the vulnerable question.",
    ],
    source: "Emotionally Focused Therapy — Dr. Sue Johnson",
    emoji: "❓",
    chatPrompt:
      "I want to understand what I'm really asking for underneath our arguments. Can you help me figure out the real question I'm trying to ask my partner?",
  },
  {
    id: "pattern-interrupt",
    name: "Pattern Interrupt",
    tagline: "Map your conflict cycle and break it",
    description:
      "Most couples are stuck in a predictable dance: one pursues, the other withdraws. Or both escalate. This exercise maps your specific pattern so you can see it coming and choose differently.",
    duration: "15 min",
    category: "conflict",
    difficulty: "intermediate",
    steps: [
      "Think of a recent conflict. Map it step by step:",
      "What triggered it? (the event)",
      "What did you feel first? (the emotion)",
      "What did you do? (your reaction)",
      "What did your partner do? (their reaction)",
      "Where did it end up? (the outcome)",
      "Now look at the pattern: does this sequence repeat?",
      "Identify ONE moment where you could have done something different.",
    ],
    source: "Emotionally Focused Therapy — Negative Interaction Cycles",
    emoji: "🔄",
    chatPrompt:
      "I notice my partner and I keep falling into the same pattern when we fight. Can you help me map our conflict cycle and find where I can interrupt it?",
  },
  // ── Connection ──
  {
    id: "bids-for-connection",
    name: "Bids for Connection",
    tagline: "Notice the small moments that build trust",
    description:
      "Gottman's research found that couples who 'turn toward' each other's bids for connection 86% of the time stayed married. Those who turned toward only 33% of the time divorced. This exercise trains you to see and respond to bids.",
    duration: "All day (awareness practice)",
    category: "connection",
    difficulty: "starter",
    steps: [
      "Today, watch for 'bids' — small moments where your partner reaches out: a sigh, a comment about their day, pointing something out, asking a question.",
      "Each time you notice one, consciously 'turn toward' it: respond, engage, show interest.",
      "Keep a mental count of how many bids you notice and how you responded.",
      "At the end of the day, reflect: which bids were easy to catch? Which did you almost miss?",
      "Tomorrow, try to catch even more.",
    ],
    source: "Gottman Method — Bids for Connection",
    emoji: "🤝",
    chatPrompt:
      "I want to get better at noticing and responding to my partner's bids for connection. Can you explain what bids look like and help me practice spotting them?",
  },
  {
    id: "love-map-update",
    name: "Love Map Update",
    tagline: "How well do you really know your partner?",
    description:
      "A 'love map' is your mental model of your partner's inner world — their worries, hopes, stresses, joys. Strong couples continuously update their love maps. This exercise checks how current yours is.",
    duration: "15 min",
    category: "connection",
    difficulty: "starter",
    steps: [
      "Without asking your partner, try to answer: What are they most stressed about right now?",
      "What are they looking forward to this week?",
      "Who is their closest friend right now? What's going on in that friendship?",
      "What's a dream or goal they've mentioned recently?",
      "Now check with your partner — how many did you get right?",
      "Ask them to do the same for you.",
    ],
    source: "Gottman Method — Love Maps",
    emoji: "🗺️",
    chatPrompt:
      "I want to update my love map — I'm not sure how well I really know what's going on in my partner's world right now. Can you help me think through some questions to reconnect?",
  },
  {
    id: "appreciation-ritual",
    name: "Daily Appreciation",
    tagline: "The simplest habit that transforms relationships",
    description:
      "Couples who maintain a 5:1 ratio of positive to negative interactions are significantly more likely to stay together. This exercise builds a daily habit of expressing genuine appreciation.",
    duration: "2 min daily",
    category: "connection",
    difficulty: "starter",
    steps: [
      "Each day, notice one specific thing your partner did that you appreciate.",
      "Be specific — not 'thanks for being great' but 'I noticed you made coffee this morning without me asking, and it made me feel cared for.'",
      "Tell them. Out loud, in person if possible.",
      "Do this every day for 7 days.",
      "After a week, notice if anything has shifted between you.",
    ],
    source: "Gottman Method — The 5:1 Ratio",
    emoji: "✨",
    chatPrompt:
      "I want to build a daily appreciation practice with my partner. Can you help me figure out how to express genuine appreciation in a way that actually lands?",
  },
  // ── Self-Awareness ──
  {
    id: "attachment-journal",
    name: "Attachment Style Journal",
    tagline: "Track when your attachment style shows up",
    description:
      "Your attachment style isn't always active — it gets triggered in specific situations. This exercise helps you identify your triggers so you can respond consciously instead of reactively.",
    duration: "5 min daily",
    category: "self-awareness",
    difficulty: "intermediate",
    steps: [
      "At the end of each day, reflect: was there a moment when you felt anxious, avoidant, or reactive in your relationship?",
      "What triggered it? (a text, a tone, a silence, a memory?)",
      "What did you feel in your body? (chest tight, stomach drop, jaw clenched?)",
      "What did you do? (check your phone, withdraw, pick a fight, people-please?)",
      "What would a more 'secure' response have looked like?",
      "No judgment — just awareness. Do this for 5 days.",
    ],
    source: "Attachment Theory — Bowlby & Ainsworth",
    emoji: "📓",
    chatPrompt:
      "I want to start tracking when my attachment style gets activated. Can you help me set up an attachment journal practice and understand what to look for?",
  },
  {
    id: "four-horsemen-scan",
    name: "Four Horsemen Check",
    tagline: "Spot the patterns that predict breakup",
    description:
      "Gottman identified four communication patterns — criticism, contempt, defensiveness, and stonewalling — that predict relationship failure with 93% accuracy. This exercise helps you honestly assess which ones show up in your relationship.",
    duration: "10 min",
    category: "self-awareness",
    difficulty: "intermediate",
    steps: [
      "Think of your last 3 arguments. For each one, ask:",
      "Did I use criticism? ('You always...' or 'You never...')",
      "Did I show contempt? (eye-rolling, sarcasm, mockery)",
      "Did I get defensive? ('That's not my fault' or 'What about when YOU...')",
      "Did I stonewall? (shutting down, walking away, going silent)",
      "Be honest — everyone has at least one horseman. Which is your default?",
      "Now identify the antidote: gentle startup (criticism), appreciation (contempt), taking responsibility (defensiveness), self-soothing (stonewalling).",
    ],
    source: "Gottman Method — The Four Horsemen of the Apocalypse",
    emoji: "🐴",
    chatPrompt:
      "I want to check if any of Gottman's Four Horsemen are showing up in my relationship. Can you help me identify which patterns I might be falling into?",
  },
  // ── Repair ──
  {
    id: "aftermath-conversation",
    name: "Aftermath Conversation",
    tagline: "Process a fight without reigniting it",
    description:
      "Most couples try to revisit fights too soon or never at all. This structured conversation — developed by Gottman — lets you process what happened without starting the fight again.",
    duration: "30 min",
    category: "repair",
    difficulty: "deep",
    steps: [
      "Wait until both of you are calm (at least 24 hours after the fight).",
      "Take turns. The speaker shares: 'During that argument, I felt...' (use emotions, not accusations).",
      "The listener's only job is to validate: 'That makes sense because...'",
      "Then switch roles.",
      "Together, identify: what triggered each of you? Was there a deeper meaning?",
      "Agree on one thing you'll each try differently next time.",
      "End with appreciation: 'One thing I admire about how you handle conflict is...'",
    ],
    source: "Gottman Method — Aftermath of a Fight",
    emoji: "🌅",
    chatPrompt:
      "We had a fight and I want to process it the right way — without starting it all over again. Can you walk me through an aftermath conversation?",
  },
  {
    id: "emotional-flooding",
    name: "Emotional Flooding First Aid",
    tagline: "What to do when you're too overwhelmed to think",
    description:
      "When your heart rate goes above 100 bpm in an argument, your prefrontal cortex goes offline. You literally can't think clearly. This exercise teaches you to recognize flooding and take a structured break.",
    duration: "20 min break",
    category: "repair",
    difficulty: "starter",
    steps: [
      "Learn your flooding signs: racing heart, clenched jaw, wanting to yell or run, feeling 'done.'",
      "When you notice them, say: 'I'm flooding. I need 20 minutes. I'll come back.'",
      "During the break: do NOT rehearse arguments. Instead:",
      "Breathe: 4 counts in, 7 hold, 8 out. Repeat 4 times.",
      "Move your body: walk, stretch, splash cold water on your face.",
      "Self-soothe: listen to music, pet your dog, do something calming.",
      "After 20 minutes, check in: 'I'm ready to try again' or 'I need a bit more time.'",
    ],
    source: "Gottman Method — Physiological Self-Soothing",
    emoji: "🌊",
    chatPrompt:
      "I get overwhelmed during arguments and either shut down or explode. Can you help me learn to recognize emotional flooding and what to do when it happens?",
  },
];

export const CATEGORIES = [
  { id: "all", label: "All", emoji: "📚" },
  { id: "communication", label: "Communication", emoji: "💬" },
  { id: "conflict", label: "Conflict", emoji: "⚡" },
  { id: "connection", label: "Connection", emoji: "🤝" },
  { id: "self-awareness", label: "Self-Awareness", emoji: "🪞" },
  { id: "repair", label: "Repair", emoji: "🩹" },
] as const;

export const DIFFICULTY_LABELS: Record<Exercise["difficulty"], string> = {
  starter: "Beginner",
  intermediate: "Intermediate",
  deep: "Deep Work",
};
