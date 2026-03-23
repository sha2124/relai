export interface QuizOption {
  id: string;
  text: string;
  scores: Partial<Record<string, number>>;
}

export interface QuizQuestion {
  id: string;
  section: string;
  question: string;
  subtitle?: string;
  options: QuizOption[];
  type: "single" | "multi";
}

export const SECTIONS = [
  { id: "intro", label: "About You", color: "#8d4837" },
  { id: "attachment", label: "How You Connect", color: "#6b8f82" },
  { id: "communication", label: "How You Communicate", color: "#7a9b90" },
  { id: "conflict", label: "How You Handle Conflict", color: "#8aa79e" },
  { id: "love", label: "What You Need", color: "#8d4837" },
  { id: "goals", label: "What Brought You Here", color: "#3a6355" },
];

export const QUESTIONS: QuizQuestion[] = [
  // --- INTRO ---
  {
    id: "relationship-status",
    section: "intro",
    question: "What best describes your current situation?",
    type: "single",
    options: [
      { id: "in-relationship", text: "In a relationship", scores: {} },
      { id: "married", text: "Married / long-term partnership", scores: {} },
      { id: "dating", text: "Dating / getting to know someone", scores: {} },
      { id: "single", text: "Single — reflecting on past relationships", scores: {} },
      { id: "complicated", text: "It's complicated", scores: {} },
    ],
  },
  {
    id: "relationship-length",
    section: "intro",
    question: "How long have you been together?",
    subtitle: "If single, think about your most significant relationship.",
    type: "single",
    options: [
      { id: "under-6mo", text: "Less than 6 months", scores: {} },
      { id: "6mo-2yr", text: "6 months to 2 years", scores: {} },
      { id: "2-5yr", text: "2 to 5 years", scores: {} },
      { id: "5-10yr", text: "5 to 10 years", scores: {} },
      { id: "10yr-plus", text: "10+ years", scores: {} },
    ],
  },

  // --- ATTACHMENT STYLE ---
  {
    id: "partner-distant",
    section: "attachment",
    question: "When your partner feels emotionally distant, you usually...",
    type: "single",
    options: [
      {
        id: "reach-out",
        text: "Reach out more — text, call, try to reconnect",
        scores: { anxious: 2 },
      },
      {
        id: "give-space",
        text: "Give them space — they'll come back when ready",
        scores: { avoidant: 2 },
      },
      {
        id: "check-in",
        text: "Check in once, then wait without stressing too much",
        scores: { secure: 2 },
      },
      {
        id: "spiral",
        text: "Oscillate between wanting to reach out and pulling away",
        scores: { anxious: 1, avoidant: 1 },
      },
    ],
  },
  {
    id: "vulnerability",
    section: "attachment",
    question: "How easy is it for you to be vulnerable with someone you love?",
    type: "single",
    options: [
      {
        id: "natural",
        text: "Pretty natural — I share openly when I trust someone",
        scores: { secure: 2 },
      },
      {
        id: "want-to",
        text: "I want to, but I worry they'll see me differently",
        scores: { anxious: 2 },
      },
      {
        id: "difficult",
        text: "It's hard — I tend to handle things on my own",
        scores: { avoidant: 2 },
      },
      {
        id: "depends",
        text: "Depends on the day — sometimes open, sometimes completely shut down",
        scores: { anxious: 1, avoidant: 1 },
      },
    ],
  },
  {
    id: "reassurance",
    section: "attachment",
    question: "How often do you need reassurance that things are okay in your relationship?",
    type: "single",
    options: [
      {
        id: "rarely",
        text: "Rarely — I generally feel secure",
        scores: { secure: 2 },
      },
      {
        id: "often",
        text: "More than I'd like to admit",
        scores: { anxious: 2 },
      },
      {
        id: "uncomfortable",
        text: "I don't really seek it — it makes me uncomfortable",
        scores: { avoidant: 2 },
      },
      {
        id: "sometimes",
        text: "Sometimes a lot, sometimes I push people away when they offer it",
        scores: { anxious: 1, avoidant: 1 },
      },
    ],
  },

  // --- COMMUNICATION STYLE ---
  {
    id: "express-needs",
    section: "communication",
    question: "When you need something from your partner, you typically...",
    type: "single",
    options: [
      {
        id: "direct",
        text: "Say it directly — \"I need you to...\"",
        scores: { "comm-direct": 2 },
      },
      {
        id: "hint",
        text: "Drop hints and hope they pick up on it",
        scores: { "comm-indirect": 2 },
      },
      {
        id: "analyze",
        text: "Think about it for a while, then bring it up logically",
        scores: { "comm-analytical": 2 },
      },
      {
        id: "emotional",
        text: "Share how I'm feeling and hope they understand the need behind it",
        scores: { "comm-expressive": 2 },
      },
    ],
  },
  {
    id: "difficult-conversation",
    section: "communication",
    question: "Before a difficult conversation, you usually...",
    type: "single",
    options: [
      {
        id: "jump-in",
        text: "Jump in — waiting makes it worse",
        scores: { "comm-direct": 2 },
      },
      {
        id: "rehearse",
        text: "Rehearse what I want to say (sometimes in the shower)",
        scores: { "comm-analytical": 2 },
      },
      {
        id: "avoid",
        text: "Put it off as long as possible",
        scores: { "comm-indirect": 2 },
      },
      {
        id: "write",
        text: "Write it down first — I express myself better that way",
        scores: { "comm-expressive": 2 },
      },
    ],
  },
  {
    id: "misunderstood",
    section: "communication",
    question: "When you feel misunderstood, your first instinct is to...",
    type: "single",
    options: [
      {
        id: "explain-more",
        text: "Explain again, more clearly",
        scores: { "comm-direct": 1, "comm-analytical": 1 },
      },
      {
        id: "get-frustrated",
        text: "Get frustrated — \"Why don't they get it?\"",
        scores: { "comm-expressive": 2 },
      },
      {
        id: "withdraw",
        text: "Go quiet — if they don't get it, maybe it's not worth explaining",
        scores: { "comm-indirect": 2 },
      },
      {
        id: "ask-them",
        text: "Ask them what they heard, to find where it got lost",
        scores: { "comm-direct": 1, "comm-expressive": 1 },
      },
    ],
  },

  // --- CONFLICT ---
  {
    id: "argument-response",
    section: "conflict",
    question: "During an argument, you're most likely to...",
    type: "single",
    options: [
      {
        id: "engage",
        text: "Stand my ground — I need to be heard",
        scores: { "conflict-fight": 2 },
      },
      {
        id: "leave",
        text: "Walk away — I need space before I say something I regret",
        scores: { "conflict-flight": 2 },
      },
      {
        id: "freeze",
        text: "Shut down — my mind goes blank",
        scores: { "conflict-freeze": 2 },
      },
      {
        id: "appease",
        text: "Apologize quickly to make the tension stop, even if I don't fully mean it",
        scores: { "conflict-fawn": 2 },
      },
    ],
  },
  {
    id: "after-argument",
    section: "conflict",
    question: "After a fight, you usually...",
    type: "single",
    options: [
      {
        id: "replay",
        text: "Replay it in my head thinking of what I should have said",
        scores: { "conflict-fight": 1, anxious: 1 },
      },
      {
        id: "move-on",
        text: "Move on quickly — dwelling doesn't help",
        scores: { "conflict-flight": 1, avoidant: 1 },
      },
      {
        id: "initiate-repair",
        text: "Initiate a calm conversation to repair things",
        scores: { secure: 1, "conflict-repair": 2 },
      },
      {
        id: "wait-them",
        text: "Wait for them to come to me",
        scores: { "conflict-freeze": 1, avoidant: 1 },
      },
    ],
  },
  {
    id: "recurring-conflict",
    section: "conflict",
    question: "Think about a recurring argument in your relationship. What's it usually really about underneath?",
    type: "single",
    options: [
      {
        id: "not-enough",
        text: "Feeling like I'm not enough or not a priority",
        scores: { anxious: 1 },
      },
      {
        id: "controlled",
        text: "Feeling controlled or losing my independence",
        scores: { avoidant: 1 },
      },
      {
        id: "not-heard",
        text: "Feeling unheard or dismissed",
        scores: { "comm-expressive": 1 },
      },
      {
        id: "fairness",
        text: "Fairness — who's doing more, who's contributing what",
        scores: { "comm-analytical": 1 },
      },
      {
        id: "not-sure",
        text: "I'm not sure — that's what I want to figure out",
        scores: {},
      },
    ],
  },

  // --- LOVE LANGUAGE ---
  {
    id: "love-feel-loved",
    section: "love",
    question: "You feel most loved when your partner...",
    type: "single",
    options: [
      {
        id: "words",
        text: "Tells me specifically what they appreciate about me",
        scores: { "love-words": 2 },
      },
      {
        id: "time",
        text: "Gives me their full, undivided attention",
        scores: { "love-time": 2 },
      },
      {
        id: "acts",
        text: "Does something thoughtful without being asked",
        scores: { "love-acts": 2 },
      },
      {
        id: "touch",
        text: "Reaches for my hand, holds me, stays physically close",
        scores: { "love-touch": 2 },
      },
    ],
  },
  {
    id: "love-show-love",
    section: "love",
    question: "And how do you tend to show love?",
    subtitle: "Sometimes how we give love is different from how we need it.",
    type: "single",
    options: [
      {
        id: "words",
        text: "I tell them — compliments, encouragement, \"I love you\"",
        scores: { "love-words": 1 },
      },
      {
        id: "time",
        text: "I make time — plan dates, put my phone away, be present",
        scores: { "love-time": 1 },
      },
      {
        id: "acts",
        text: "I do things — cook for them, handle logistics, anticipate needs",
        scores: { "love-acts": 1 },
      },
      {
        id: "touch",
        text: "Physical closeness — hugs, hand on their back, cuddling",
        scores: { "love-touch": 1 },
      },
    ],
  },

  // --- GOALS ---
  {
    id: "why-here",
    section: "goals",
    question: "What brought you here today?",
    subtitle: "Pick the one that resonates most.",
    type: "single",
    options: [
      {
        id: "understand-self",
        text: "I want to understand my own patterns better",
        scores: {},
      },
      {
        id: "fix-conflict",
        text: "We're stuck in a cycle and I want to break it",
        scores: {},
      },
      {
        id: "communicate-better",
        text: "I want to communicate better with someone I love",
        scores: {},
      },
      {
        id: "process-past",
        text: "I'm processing a past relationship or family dynamic",
        scores: {},
      },
      {
        id: "strengthen",
        text: "Things are good — I just want to make them even better",
        scores: {},
      },
    ],
  },
  {
    id: "name",
    section: "goals",
    question: "Last thing — what should I call you?",
    subtitle: "Just a first name is perfect.",
    type: "single",
    options: [],
  },
];
