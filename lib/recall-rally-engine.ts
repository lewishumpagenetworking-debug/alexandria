import { getInterpretationsForHighlight, getPrinciplesForHighlight } from "@/lib/library-notes-store";
import { listCards, type RetrievalCard } from "@/lib/retrieval-store";

export type RallyQuestionType = "recall" | "meaning" | "principle" | "application";

export interface RallyChallenge {
  card: RetrievalCard;
  type: RallyQuestionType;
  prompt: string;
  expected?: string;
  sourceText: string;
  guidance: string;
  difficulty: number;
}

function stableNoise(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967295;
}

function scoreCard(card: RetrievalCard, level: number, usedIds: Set<string>): number {
  const now = Date.now();
  const last = card.lastReviewedAt || card.lastEngagedAt;
  const daysSince = last ? Math.max(0, (now - new Date(last).getTime()) / 86400000) : 999;
  const novelty = card.reviewCount === 0 ? 42 : 0;
  const due = card.dueAt <= new Intl.DateTimeFormat("en-CA").format(new Date()) ? 34 : 0;
  const weakness = Math.max(0, 24 - card.intervalDays * 3);
  const priority = card.priorityWeight ?? 0;
  const repeatPenalty = usedIds.has(card.id) ? 100 : 0;
  const levelNoise = stableNoise(`${card.id}:${level}`) * 12;
  return novelty + due + weakness + priority + Math.min(28, daysSince) + levelNoise - repeatPenalty;
}

export function buildRallyDeck(sourceTitle?: string): RetrievalCard[] {
  const cards = listCards();
  return sourceTitle && sourceTitle !== "all"
    ? cards.filter((card) => card.label === sourceTitle)
    : cards;
}

export function chooseRallyCard(deck: RetrievalCard[], level: number, usedIds: Set<string>): RetrievalCard | null {
  if (!deck.length) return null;
  const ranked = deck.map((card) => ({ card, score: scoreCard(card, level, usedIds) })).sort((a, b) => b.score - a.score);
  const fresh = ranked.find(({ card }) => !usedIds.has(card.id));
  return (fresh ?? ranked[0])?.card ?? null;
}

export function buildRallyChallenge(card: RetrievalCard, level: number, questionIndex: number): RallyChallenge {
  const linkedInterpretation = card.refType === "highlight" ? getInterpretationsForHighlight(card.refId)[0]?.text : undefined;
  const linkedPrinciple = card.refType === "highlight" ? getPrinciplesForHighlight(card.refId)[0]?.statement : undefined;

  const preferred: RallyQuestionType[] =
    level <= 2 ? ["recall"] :
    level <= 4 ? ["meaning", "recall"] :
    level <= 6 ? ["principle", "meaning", "recall"] :
    ["application", "principle", "meaning", "recall"];

  const rotate = questionIndex % preferred.length;
  const ordered = [...preferred.slice(rotate), ...preferred.slice(0, rotate)];

  for (const type of ordered) {
    if (type === "meaning" && linkedInterpretation) {
      return {
        card, type, sourceText: card.text, difficulty: Math.min(6, 2 + Math.floor(level / 2)),
        prompt: "Explain what this passage means in plain language.",
        expected: linkedInterpretation,
        guidance: "Compare your answer with the interpretation captured from this exact imported row.",
      };
    }
    if (type === "principle" && linkedPrinciple) {
      return {
        card, type, sourceText: card.text, difficulty: Math.min(6, 3 + Math.floor(level / 2)),
        prompt: "What reusable principle was derived from this passage?",
        expected: linkedPrinciple,
        guidance: "State the principle without copying the quote. Then compare it with the imported principle.",
      };
    }
    if (type === "application") {
      const base = linkedPrinciple || linkedInterpretation || card.text;
      return {
        card, type, sourceText: card.text, difficulty: Math.min(6, 4 + Math.floor(level / 2)),
        prompt: "Give one concrete situation where this idea would change a decision or action.",
        expected: base,
        guidance: "There is no single wording to match. Your application should clearly use the idea, name a real situation, and change what someone would do.",
      };
    }
    if (type === "recall") {
      return {
        card, type, sourceText: card.text, difficulty: Math.min(6, 1 + Math.floor(level / 2)),
        prompt: card.refType === "principle"
          ? "State this principle from memory before revealing it."
          : "Reconstruct the idea from memory before revealing the original.",
        expected: card.text,
        guidance: "Judge whether you preserved the central meaning, not whether you reproduced the exact wording.",
      };
    }
  }

  return {
    card, type: "recall", sourceText: card.text, difficulty: 1,
    prompt: "What do you remember?", expected: card.text,
    guidance: "Preserve the central meaning.",
  };
}
