import type { QuizQuestion } from "./questions";

export interface UserProfile {
  name: string;
  relationshipStatus: string;
  relationshipLength: string;
  attachmentStyle: {
    primary: string;
    label: string;
    description: string;
  };
  communicationStyle: {
    primary: string;
    label: string;
    description: string;
  };
  conflictResponse: {
    primary: string;
    label: string;
    description: string;
  };
  loveLanguage: {
    receiving: string;
    giving: string;
    receivingLabel: string;
    givingLabel: string;
  };
  goal: string;
  goalLabel: string;
  scores: Record<string, number>;
}

const ATTACHMENT_LABELS: Record<string, { label: string; description: string }> = {
  secure: {
    label: "Secure",
    description: "You generally feel comfortable with closeness and trust. You can express your needs openly and give your partner space without much anxiety. This is your foundation — and it's a strong one.",
  },
  anxious: {
    label: "Anxious",
    description: "You crave closeness and can be highly attuned to shifts in your partner's mood or availability. When connection feels threatened, you tend to reach out more. Your superpower is emotional sensitivity — your challenge is not letting fear drive the reaching.",
  },
  avoidant: {
    label: "Avoidant",
    description: "You value independence and can feel overwhelmed when relationships get too intense. You tend to process emotions internally and need space to decompress. Your superpower is self-reliance — your challenge is letting people in before they stop trying.",
  },
};

const COMM_LABELS: Record<string, { label: string; description: string }> = {
  "comm-direct": {
    label: "Direct",
    description: "You say what you mean and prefer others do the same. You'd rather have an uncomfortable truth than a comfortable silence.",
  },
  "comm-indirect": {
    label: "Indirect",
    description: "You tend to communicate through context, hints, and actions rather than explicit words. You're attuned to what's unspoken.",
  },
  "comm-analytical": {
    label: "Analytical",
    description: "You like to think things through before speaking. You approach conversations logically and want to understand the 'why' before responding.",
  },
  "comm-expressive": {
    label: "Expressive",
    description: "You lead with emotion and need to feel heard before you can problem-solve. Processing out loud is how you make sense of things.",
  },
};

const CONFLICT_LABELS: Record<string, { label: string; description: string }> = {
  "conflict-fight": {
    label: "Fight (Engage)",
    description: "Your instinct is to lean in and be heard. Conflict activates you — you'd rather hash it out than let it simmer.",
  },
  "conflict-flight": {
    label: "Flight (Withdraw)",
    description: "Your instinct is to step away when things get heated. You need space to regulate before you can engage constructively.",
  },
  "conflict-freeze": {
    label: "Freeze (Shut Down)",
    description: "Under pressure, you tend to go blank or numb. It's not that you don't care — your nervous system is protecting you.",
  },
  "conflict-fawn": {
    label: "Fawn (Appease)",
    description: "Your instinct is to smooth things over quickly, even at your own expense. Keeping the peace feels safer than standing your ground.",
  },
  "conflict-repair": {
    label: "Repair (Resolve)",
    description: "You naturally move toward resolution. After the dust settles, you're the one who initiates the calm conversation to make things right.",
  },
};

const LOVE_LABELS: Record<string, string> = {
  "love-words": "Words of Affirmation",
  "love-time": "Quality Time",
  "love-acts": "Acts of Service",
  "love-touch": "Physical Touch",
};

const GOAL_LABELS: Record<string, string> = {
  "understand-self": "Understanding your own patterns",
  "fix-conflict": "Breaking a recurring cycle",
  "communicate-better": "Better communication",
  "process-past": "Processing past experiences",
  "strengthen": "Strengthening what's already good",
};

function getTopScore(scores: Record<string, number>, prefix: string): string {
  const filtered = Object.entries(scores)
    .filter(([key]) => key.startsWith(prefix) || (prefix === "attachment" && ["secure", "anxious", "avoidant"].includes(key)))
    .sort(([, a], [, b]) => b - a);

  return filtered[0]?.[0] ?? (prefix === "attachment" ? "secure" : `${prefix}-direct`);
}

export function computeProfile(
  answers: Record<string, string>,
  questions: QuizQuestion[]
): UserProfile {
  // Tally scores
  const scores: Record<string, number> = {};

  for (const question of questions) {
    const answerId = answers[question.id];
    if (!answerId) continue;

    const option = question.options.find((o) => o.id === answerId);
    if (!option) continue;

    for (const [key, value] of Object.entries(option.scores)) {
      scores[key] = (scores[key] ?? 0) + (value ?? 0);
    }
  }

  // Determine attachment style
  const attachmentKey = getTopScore(scores, "attachment");
  const attachment = ATTACHMENT_LABELS[attachmentKey] ?? ATTACHMENT_LABELS.secure;

  // Determine communication style
  const commKey = getTopScore(scores, "comm-");
  const communication = COMM_LABELS[commKey] ?? COMM_LABELS["comm-direct"];

  // Determine conflict response
  const conflictKey = getTopScore(scores, "conflict-");
  const conflict = CONFLICT_LABELS[conflictKey] ?? CONFLICT_LABELS["conflict-fight"];

  // Determine love languages
  const loveReceiving = answers["love-feel-loved"] ?? "time";
  const loveGiving = answers["love-show-love"] ?? "time";

  // Goal
  const goal = answers["why-here"] ?? "understand-self";

  return {
    name: answers.name ?? "there",
    relationshipStatus: answers["relationship-status"] ?? "",
    relationshipLength: answers["relationship-length"] ?? "",
    attachmentStyle: {
      primary: attachmentKey,
      label: attachment.label,
      description: attachment.description,
    },
    communicationStyle: {
      primary: commKey,
      label: communication.label,
      description: communication.description,
    },
    conflictResponse: {
      primary: conflictKey,
      label: conflict.label,
      description: conflict.description,
    },
    loveLanguage: {
      receiving: loveReceiving,
      giving: loveGiving,
      receivingLabel: LOVE_LABELS[`love-${loveReceiving}`] ?? "Quality Time",
      givingLabel: LOVE_LABELS[`love-${loveGiving}`] ?? "Quality Time",
    },
    goal,
    goalLabel: GOAL_LABELS[goal] ?? "Understanding your patterns",
    scores,
  };
}
