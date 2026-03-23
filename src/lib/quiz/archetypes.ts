/**
 * Relationship Archetypes
 *
 * Each archetype is a named persona derived from the combination of
 * attachment style + communication style + conflict response.
 * When no exact match exists, we fall back to attachment-based archetypes.
 */

export interface Archetype {
  name: string;
  tagline: string;
  description: string;
  strengths: string[];
  blindSpots: string[];
  growthEdge: string;
  color: string; // accent color for the archetype card
  emoji: string;
}

const ARCHETYPES: Record<string, Archetype> = {
  // ── Secure-based archetypes ──
  "secure+comm-direct+conflict-repair": {
    name: "The Steady Flame",
    tagline: "Warm, direct, and built for the long game",
    description:
      "You bring calm confidence to your relationships. You say what you mean, repair what breaks, and make people feel safe enough to be honest. You're the person others lean on — just make sure someone's holding space for you too.",
    strengths: ["Emotional stability", "Honest communication", "Natural conflict resolver"],
    blindSpots: ["May dismiss others' anxiety as overreaction", "Can neglect your own needs while steadying everyone else"],
    growthEdge: "Let yourself be the one who needs support sometimes. Vulnerability isn't weakness — it's an invitation.",
    color: "#4a7c6b",
    emoji: "🕯️",
  },
  "secure+comm-expressive+conflict-repair": {
    name: "The Open Heart",
    tagline: "Feels deeply, loves loudly, fixes what breaks",
    description:
      "You lead with emotion and follow through with action. When things get hard, you don't shut down — you lean in. Your willingness to be vulnerable is your superpower, and it makes the people around you braver too.",
    strengths: ["Emotional depth", "Willingness to be vulnerable", "Strong repair instinct"],
    blindSpots: ["Can overwhelm quieter partners with emotional intensity", "May process out loud before thinking it through"],
    growthEdge: "Sometimes the most loving thing is to pause before you speak — give your partner space to come to you.",
    color: "#c45c5c",
    emoji: "💗",
  },
  "secure+comm-analytical+conflict-repair": {
    name: "The Architect",
    tagline: "Thoughtful, steady, builds relationships that last",
    description:
      "You approach love like you approach everything — with intention. You think before you speak, plan before you act, and when something breaks, you want to understand why before you fix it. Your relationships are well-built because you build them on purpose.",
    strengths: ["Thoughtful decision-making", "Emotional consistency", "Problem-solving under pressure"],
    blindSpots: ["Can seem emotionally distant when you're actually just processing", "May over-analyze feelings instead of feeling them"],
    growthEdge: "Not everything needs to be understood to be felt. Sometimes 'I don't know why, but this matters to me' is enough.",
    color: "#5c7a9c",
    emoji: "🏗️",
  },

  // ── Anxious-based archetypes ──
  "anxious+comm-expressive+conflict-fight": {
    name: "The Passionate Protector",
    tagline: "Loves hard, fights hard, never gives up",
    description:
      "You feel everything at full volume and you're not afraid to show it. When connection feels threatened, you don't pull away — you push forward. Your intensity comes from how much you care, but sometimes it can feel like too much for the people around you.",
    strengths: ["Deep emotional attunement", "Fierce loyalty", "Willingness to address problems head-on"],
    blindSpots: ["Can mistake intensity for intimacy", "May pursue when your partner needs space", "Arguments can escalate before you realize it"],
    growthEdge: "The chase isn't love. Practice sitting with discomfort instead of filling the silence — trust that your partner will come back.",
    color: "#d4726a",
    emoji: "🔥",
  },
  "anxious+comm-indirect+conflict-fawn": {
    name: "The Peacekeeper",
    tagline: "Keeps the harmony, carries the weight",
    description:
      "You have an extraordinary ability to read a room and sense when something's off. You adapt, you smooth things over, you make sure everyone's okay — often before they even realize something was wrong. But who's making sure you're okay?",
    strengths: ["Emotional intelligence", "Conflict de-escalation", "Deep empathy"],
    blindSpots: ["Suppresses your own needs to avoid rocking the boat", "Can lose yourself in what your partner wants", "Resentment builds silently"],
    growthEdge: "Your needs aren't a burden. Practice one honest 'I need...' statement this week — even if your voice shakes.",
    color: "#8a9c6b",
    emoji: "🕊️",
  },
  "anxious+comm-direct+conflict-fight": {
    name: "The Truth-Teller",
    tagline: "Says what others won't, feels what others can't",
    description:
      "You combine emotional sensitivity with radical honesty. You see the elephant in the room and you name it. This makes you magnetic — and sometimes exhausting. You'd rather have a hard conversation than pretend everything's fine.",
    strengths: ["Emotional honesty", "Courage in vulnerability", "Pushes relationships to grow"],
    blindSpots: ["Can come across as confrontational when you're actually scared", "Timing — not every truth needs to be told right now"],
    growthEdge: "Try leading with the feeling underneath the frustration. 'I'm scared you're pulling away' lands differently than 'Why aren't you texting me back?'",
    color: "#b8724a",
    emoji: "⚡",
  },
  "anxious+comm-expressive+conflict-fawn": {
    name: "The Tender Heart",
    tagline: "Feels everything, gives everything, needs to learn to keep some",
    description:
      "You love with your whole chest and it shows. You're the person who writes the long messages, plans the thoughtful surprises, and always checks in. Your generosity is genuine — but sometimes it's driven by a fear that you're not enough as you are.",
    strengths: ["Emotional generosity", "Intuitive understanding of others", "Creates deep intimacy quickly"],
    blindSpots: ["Over-gives to earn love", "Avoids conflict to keep connection", "Can lose your identity in relationships"],
    growthEdge: "You are enough without the grand gestures. Practice receiving without immediately giving back.",
    color: "#c4849c",
    emoji: "🌸",
  },

  // ── Avoidant-based archetypes ──
  "avoidant+comm-analytical+conflict-flight": {
    name: "The Lone Wolf",
    tagline: "Self-reliant, deep-thinking, hard to reach",
    description:
      "You've built a life that works on your own terms. You're thoughtful, capable, and don't need anyone to complete you. But sometimes 'not needing anyone' is a story you tell yourself so you don't have to risk being disappointed.",
    strengths: ["Emotional self-regulation", "Independence", "Clear thinking under pressure"],
    blindSpots: ["Withdrawing feels like self-care but looks like rejection to your partner", "Can intellectualize emotions to avoid feeling them", "Sets boundaries that are actually walls"],
    growthEdge: "Needing someone isn't weakness. Try staying 10 minutes longer in an uncomfortable conversation instead of walking away.",
    color: "#6b7a8a",
    emoji: "🐺",
  },
  "avoidant+comm-direct+conflict-flight": {
    name: "The Fortress",
    tagline: "Strong walls, soft center, selective entry",
    description:
      "You know who you are and what you want. You can be direct and clear — until things get emotionally intense, and then you need out. It's not that you don't feel things. You feel them so deeply that shutting down feels safer than falling apart.",
    strengths: ["Self-awareness", "Clear communication when calm", "Emotional composure"],
    blindSpots: ["Flight response kicks in right when your partner needs you most", "Directness can feel cold when paired with emotional distance"],
    growthEdge: "Your partner isn't the threat — the vulnerability is. Next time you want to leave the room, try saying 'I need a minute but I'm coming back.'",
    color: "#7a6b5c",
    emoji: "🏰",
  },
  "avoidant+comm-indirect+conflict-freeze": {
    name: "The Still Water",
    tagline: "Calm on the surface, deep underneath",
    description:
      "People often misread your quietness as not caring. The truth is the opposite — you feel so much that your system shuts down to protect you. You communicate in subtle ways that the right person will learn to read, but most people miss.",
    strengths: ["Calm presence", "Deep inner world", "Non-reactive in crisis"],
    blindSpots: ["Partners may feel shut out or ignored", "Freezing looks like stonewalling even when it's not intentional", "Needs go unexpressed until it's too late"],
    growthEdge: "You don't have to have the perfect words. 'I'm feeling a lot and I can't talk yet' is enough to keep the door open.",
    color: "#5c8a9c",
    emoji: "🌊",
  },
  "avoidant+comm-analytical+conflict-repair": {
    name: "The Slow Burn",
    tagline: "Takes time to open up, but worth the wait",
    description:
      "You're not cold — you're careful. You need time to process, space to think, and trust before you let anyone in. But once you do, you show up fully. Your love is quiet, consistent, and deeply intentional.",
    strengths: ["Thoughtful partner", "Consistent once committed", "Logical problem-solver in conflict"],
    blindSpots: ["Can take so long to process that your partner feels abandoned", "May prioritize being 'right' over being connected"],
    growthEdge: "Speed up your repair timeline. A quick 'I'm still thinking about what you said' goes further than silence.",
    color: "#8a7a6b",
    emoji: "🕰️",
  },
};

/**
 * Fallback archetypes when no exact trait combo matches.
 * Keyed by attachment style alone.
 */
const ATTACHMENT_FALLBACKS: Record<string, Archetype> = {
  secure: {
    name: "The Anchor",
    tagline: "Grounded, present, and emotionally available",
    description:
      "You bring stability and warmth to your relationships. You're comfortable with closeness and can give space without anxiety. People feel safe around you — and that's not a small thing.",
    strengths: ["Emotional availability", "Healthy boundaries", "Consistent presence"],
    blindSpots: ["May underestimate how hard relationships are for others", "Can become complacent in 'good enough'"],
    growthEdge: "Keep growing even when things feel stable. Comfort zones can become ruts.",
    color: "#4a7c6b",
    emoji: "⚓",
  },
  anxious: {
    name: "The Seeker",
    tagline: "Always reaching for deeper connection",
    description:
      "You have an extraordinary capacity for love and an equally powerful fear of losing it. You notice every shift in energy, every unreturned text, every change in tone. Your sensitivity is a gift — when you learn to trust it instead of being ruled by it.",
    strengths: ["Emotional attunement", "Deep capacity for intimacy", "Willingness to work on the relationship"],
    blindSpots: ["Can interpret distance as rejection", "Reassurance-seeking can push partners away", "Difficulty self-soothing"],
    growthEdge: "Build your own emotional home base. The most attractive version of you is the one who wants connection but doesn't need it to feel whole.",
    color: "#c4849c",
    emoji: "🔍",
  },
  avoidant: {
    name: "The Island",
    tagline: "Complete alone, learning to let someone in",
    description:
      "You've learned to be your own safe harbor. Independence isn't just a preference — it's how you survived. The challenge now isn't building walls. It's learning which ones to keep and which ones to let someone walk through.",
    strengths: ["Self-reliance", "Emotional composure", "Low drama"],
    blindSpots: ["Independence can become isolation", "May not recognize when you're pushing people away", "Struggles to ask for help"],
    growthEdge: "Practice one small act of dependence this week. Let someone help you — even when you don't need it.",
    color: "#6b7a8a",
    emoji: "🏝️",
  },
};

/**
 * Determines the user's archetype from their computed profile traits.
 */
export function getArchetype(
  attachmentPrimary: string,
  communicationPrimary: string,
  conflictPrimary: string
): Archetype {
  // Try exact match first
  const key = `${attachmentPrimary}+${communicationPrimary}+${conflictPrimary}`;
  if (ARCHETYPES[key]) return ARCHETYPES[key];

  // Try partial matches (attachment + communication)
  const partialKey = Object.keys(ARCHETYPES).find(
    (k) => k.startsWith(`${attachmentPrimary}+${communicationPrimary}+`)
  );
  if (partialKey) return ARCHETYPES[partialKey];

  // Try partial matches (attachment + conflict)
  const partialKey2 = Object.keys(ARCHETYPES).find(
    (k) => k.startsWith(`${attachmentPrimary}+`) && k.endsWith(`+${conflictPrimary}`)
  );
  if (partialKey2) return ARCHETYPES[partialKey2];

  // Fall back to attachment-only archetype
  return ATTACHMENT_FALLBACKS[attachmentPrimary] ?? ATTACHMENT_FALLBACKS.secure;
}
