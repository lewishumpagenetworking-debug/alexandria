import { getKnowledgeUnitByHighlight, getKnowledgeUnitCard } from "@/lib/knowledge-unit-store";
import { buildKnowledgeChallengeForUnit, getKnowledgeChallengeDeck, type SculptorChallengeType } from "@/lib/sculptor-challenge-engine";
import type { RetrievalCard } from "@/lib/retrieval-store";

export type RallyQuestionType = "recall" | "meaning" | "principle" | "application" | "boundary";

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
  return getKnowledgeChallengeDeck(sourceTitle)
    .map((unit) => getKnowledgeUnitCard(unit))
    .filter((card): card is RetrievalCard => Boolean(card));
}

export function chooseRallyCard(deck: RetrievalCard[], level: number, usedIds: Set<string>): RetrievalCard | null {
  if (!deck.length) return null;
  const ranked = deck.map((card) => ({ card, score: scoreCard(card, level, usedIds) })).sort((a, b) => b.score - a.score);
  const fresh = ranked.find(({ card }) => !usedIds.has(card.id));
  return (fresh ?? ranked[0])?.card ?? null;
}

function allowedTypesForLevel(level: number): SculptorChallengeType[] {
  if (level <= 2) return ["retrieval", "diagnosis"];
  if (level <= 4) return ["diagnosis", "retrieval", "principle"];
  if (level <= 6) return ["principle", "diagnosis", "boundary"];
  return ["application", "boundary", "principle", "diagnosis"];
}

export function buildRallyChallenge(card: RetrievalCard, level: number, questionIndex: number): RallyChallenge {
  const unit = card.refType === "highlight" ? getKnowledgeUnitByHighlight(card.refId) : undefined;
  if (!unit) {
    return {
      card,
      type: "recall",
      sourceText: card.text,
      difficulty: Math.min(8, 1 + Math.floor(level / 2)),
      prompt: "Explain the central idea in your own words.",
      expected: card.text,
      guidance: "Preserve the meaning rather than reproducing the wording.",
    };
  }

  const allowed = allowedTypesForLevel(level);
  const rotate = questionIndex % allowed.length;
  const rotated = [...allowed.slice(rotate), ...allowed.slice(0, rotate)];
  const challenge = buildKnowledgeChallengeForUnit(unit, card, {
    allowedTypes: rotated,
    difficulty: level,
  });

  const typeMap: Record<SculptorChallengeType, RallyQuestionType> = {
    retrieval: "recall",
    diagnosis: "meaning",
    principle: "principle",
    boundary: "boundary",
    application: "application",
  };

  return {
    card,
    type: typeMap[challenge.type],
    sourceText: unit.quote,
    difficulty: challenge.difficulty,
    prompt: challenge.prompt,
    expected: challenge.expected,
    guidance: challenge.guidance,
  };
}
