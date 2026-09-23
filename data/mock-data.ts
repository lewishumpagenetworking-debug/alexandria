import type { Book, CapabilityEvidence, Question, Source } from "@/models/domain";

export const currentBook: Book = {
  id: "book-beginning-infinity",
  type: "book",
  title: "The Beginning of Infinity",
  creator: "David Deutsch",
  author: "David Deutsch",
  description: "Explanations, error correction, optimism, and the open-ended creation of knowledge.",
  hallIds: ["natural-philosophy", "logic-systems"],
  state: "interrogated",
  currentPage: 218,
  totalPages: 341,
  currentChapter: 9,
  totalChapters: 18,
  createdAt: "2026-09-01T08:00:00.000Z",
};

export const sources: Source[] = [
  currentBook,
  {
    id: "book-other-minds",
    type: "book",
    title: "Other Minds",
    creator: "Peter Godfrey-Smith",
    description: "The octopus, the sea, and the deep origins of consciousness.",
    hallIds: ["natural-philosophy", "human-nature"],
    state: "reduced",
    createdAt: "2026-08-01T08:00:00.000Z",
  },
  {
    id: "experience-pricing-decision",
    type: "experience",
    title: "The pricing decision",
    creator: "Strategy",
    description: "A failed test that changed how I think about optionality and irreversible choices.",
    hallIds: ["strategy-power", "commerce-creation"],
    state: "revised",
    createdAt: "2026-09-12T08:00:00.000Z",
  },
];

export const sourceMetrics = [
  "28 highlights · 7 principles · 3 applications",
  "19 highlights · 4 principles · 1 revision",
  "5 observations · 2 contradictions · 1 revised model",
];

export const halls = [
  { roman: "I", id: "natural-philosophy", count: "42 principles · 8 sources", title: "Natural Philosophy", description: "Physics, astronomy, biology, evolution, scientific discovery, nature and reality." },
  { roman: "II", id: "human-nature", count: "57 principles · 13 sources", title: "Human Nature", description: "Psychology, behaviour, incentives, relationships, persuasion and cognition." },
  { roman: "III", id: "strategy-power", count: "38 principles · 11 sources", title: "Strategy & Power", description: "History, warfare, competition, statecraft, negotiation and strategic thought." },
  { roman: "IV", id: "commerce-creation", count: "46 principles · 9 sources", title: "Commerce & Creation", description: "Entrepreneurship, markets, organisations, innovation, products and building." },
  { roman: "V", id: "logic-systems", count: "35 principles · 7 sources", title: "Logic & Systems", description: "Mathematics, probability, computation, systems, models and decision science." },
  { roman: "VI", id: "examined-life", count: "31 principles · 10 sources", title: "The Examined Life", description: "Philosophy, ethics, meaning, character, mortality and ways of living." },
];

export const interrogationQuestions: Question[] = [
  ["Why did this idea deserve to survive the page?", "statement"],
  ["What do you think the author actually means?", "assumptions"],
  ["What must be true for this claim to hold?", "fundamentals"],
  ["What can be removed without destroying the argument?", "reduction"],
  ["If you knew only the fundamentals, could you rebuild the conclusion?", "reconstruction"],
  ["Where does this principle stop working?", "boundaries"],
  ["Where could you apply this tomorrow?", "application"],
].map(([prompt, stage], index) => ({ id: `question-${index + 1}`, prompt, stage: stage as Question["stage"], sourceId: currentBook.id }));

export const agoraScenarios = [
  "A trusted colleague challenges your strategy in front of the team. Their objection is partly right, but conceding immediately may damage confidence. What do you do next—and why?",
  "A competitor copies your strongest feature and offers it for free. You have one week to respond. What matters most?",
  "A friend asks for honest advice, but you suspect they want reassurance. How do you decide what truthfulness requires?",
];

export const forumChallenges = [
  { challenge: "Explain sunk costs to a founder who has spent three years building.", audience: "Intelligent non-expert", format: "Explanation" },
  { challenge: "Explain why a reversible decision deserves less caution than an irreversible one.", audience: "Sceptic", format: "Argument" },
  { challenge: "Explain incentive design to a new manager who just inherited a demotivated team.", audience: "CEO", format: "Impromptu speech" },
];

export const seedRecallPassages = [
  { id: "infinity-optimism", source: "The Beginning of Infinity", text: "Problems are inevitable. Problems are soluble." },
  { id: "feynman-doubt", source: "Surely You’re Joking, Mr. Feynman!", text: "I learned very early the difference between knowing the name of something and knowing something." },
  { id: "kuhn-paradigm", source: "The Structure of Scientific Revolutions", text: "A paradigm governs, in the first instance, not a subject matter but a group of practitioners." },
];

export const initialForumFeedback = [
  ["Structure", "State the decision before explaining the concept. The listener needs to know what is at stake."],
  ["Analogy", "Your bridge example is concrete. Keep it; remove the second example."],
  ["Unsupported claim", "“Rational people ignore the past” needs qualification. Emotion and reputation remain real present costs."],
  ["Conclusion", "End with a test: “If we had not already invested, would we begin today?”"],
];

export const analysedForumFeedback = [
  ["Opening", "Your claim becomes clear in the second sentence. Move it to the first."],
  ["Causal chain", "You distinguish past cost from future value well. Preserve that distinction."],
  ["Audience fit", "Replace “opportunity cost” with the concrete choice the founder faces tomorrow."],
  ["Next compression", "Keep the test question and remove the abstract definition. Try again in 30 seconds."],
];

export const capabilityEvidence: CapabilityEvidence[] = [
  { id: "ce-1", capability: "knowledge", statement: "Reconstructed 6 principles without source language.", provenance: "Evidence from 9 interrogation sessions", strength: "demonstrated", recordedAt: "2026-09-16T08:00:00.000Z" },
  { id: "ce-2", capability: "knowledge", statement: "Connected error correction across biology, organisations, and science.", provenance: "3 cross-hall connections", strength: "developing", recordedAt: "2026-09-16T08:00:00.000Z" },
  { id: "ce-3", capability: "reason", statement: "Named disconfirming evidence before 5 consequential decisions.", provenance: "Agora and applied principles", strength: "demonstrated", recordedAt: "2026-09-16T08:00:00.000Z" },
  { id: "ce-4", capability: "reason", statement: "Generated a strong opposing argument in 7 of 10 recent sessions.", provenance: "Needs practice under 60 seconds", strength: "developing", recordedAt: "2026-09-16T08:00:00.000Z" },
  { id: "ce-5", capability: "communication", statement: "Compressed one explanation from five minutes to thirty seconds without losing its causal chain.", provenance: "Forum · 2 days ago", strength: "demonstrated", recordedAt: "2026-09-15T08:00:00.000Z" },
  { id: "ce-6", capability: "communication", statement: "Examples are concrete; conclusions still arrive late.", provenance: "Pattern across 4 Forum sessions", strength: "developing", recordedAt: "2026-09-15T08:00:00.000Z" },
  { id: "ce-7", capability: "action", statement: "Revised 4 previously held conclusions after contradictory evidence.", provenance: "Belief history preserved", strength: "demonstrated", recordedAt: "2026-09-14T08:00:00.000Z" },
  { id: "ce-8", capability: "action", statement: "Recorded outcomes for 8 of 11 applied principles.", provenance: "Three observations are overdue", strength: "developing", recordedAt: "2026-09-14T08:00:00.000Z" },
];
