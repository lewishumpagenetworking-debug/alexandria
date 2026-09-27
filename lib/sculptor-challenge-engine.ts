import { getKnowledgeUnitCard, listKnowledgeUnits, recordKnowledgeUnitSurfaced } from "@/lib/knowledge-unit-store";
import type { KnowledgeUnit } from "@/models/domain";
import type { RetrievalCard } from "@/lib/retrieval-store";

export type SculptorChallengeType = "diagnosis" | "retrieval" | "principle" | "boundary" | "application";

export interface SculptorChallenge {
  id: string;
  unit: KnowledgeUnit;
  card: RetrievalCard;
  type: SculptorChallengeType;
  prompt: string;
  expected?: string;
  guidance: string;
  difficulty: number;
}

export interface ChallengeRequest {
  sourceTitle?: string;
  allowedTypes?: SculptorChallengeType[];
  difficulty?: number;
  excludeUnitIds?: Set<string>;
  dueOnly?: boolean;
  recordSurface?: boolean;
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function stableNoise(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967295;
}

function scoreUnit(unit: KnowledgeUnit, card: RetrievalCard, request: ChallengeRequest): number {
  const last = card.lastReviewedAt || card.lastEngagedAt || unit.lastSurfacedAt;
  const daysSince = last ? Math.max(0, (Date.now() - new Date(last).getTime()) / 86400000) : 999;
  const dueBonus = card.dueAt <= todayISO() ? 45 : 0;
  const unseen = card.reviewCount === 0 ? 36 : 0;
  const weakness = Math.max(0, 30 - card.intervalDays * 3);
  const priority = card.priorityWeight ?? unit.priority * 8;
  const recentPenalty = last && daysSince < 1 ? 35 : last && daysSince < 3 ? 12 : 0;
  return dueBonus + unseen + weakness + priority + Math.min(28, daysSince) - recentPenalty + stableNoise(unit.id) * 10;
}

function chooseType(unit: KnowledgeUnit, request: ChallengeRequest): SculptorChallengeType {
  const allowed = request.allowedTypes?.length
    ? request.allowedTypes
    : ["diagnosis", "retrieval", "principle", "boundary", "application"];

  const difficulty = request.difficulty ?? 1;
  const preferred: SculptorChallengeType[] =
    difficulty <= 2 ? ["diagnosis", "retrieval"] :
    difficulty <= 4 ? ["principle", "diagnosis", "retrieval"] :
    difficulty <= 6 ? ["boundary", "principle", "diagnosis", "retrieval"] :
    ["application", "boundary", "principle", "diagnosis", "retrieval"];

  return preferred.find((type) => allowed.includes(type)) ?? allowed[0] ?? "diagnosis";
}

function buildPrompt(unit: KnowledgeUnit, type: SculptorChallengeType, difficulty: number): Omit<SculptorChallenge, "id" | "unit" | "card" | "type" | "difficulty"> {
  if (type === "diagnosis") return {
    prompt: "What do you think this quote means? Diagnose the underlying idea, motive, assumption, or lesson in your own words.",
    expected: unit.alexandriaDiagnosis || unit.principle,
    guidance: unit.alexandriaDiagnosis
      ? "Compare your diagnosis with Alexandria's stored interpretation after you commit."
      : "Focus on the central claim and what it implies. No stored diagnosis exists yet.",
  };

  if (type === "principle") return {
    prompt: "What reusable principle can be extracted from this passage without copying its wording?",
    expected: unit.principle || unit.alexandriaDiagnosis,
    guidance: "State the transferable idea, not a summary of the sentence.",
  };

  if (type === "boundary") return {
    prompt: "Where would this idea fail, become misleading, or need qualification?",
    expected: unit.boundaries[0] || unit.counterarguments[0] || unit.alexandriaDiagnosis || unit.principle,
    guidance: "Name at least one condition or counterexample that limits the claim.",
  };

  if (type === "application") return {
    prompt: "Give one concrete situation where this idea should change a decision or action.",
    expected: unit.principle || unit.alexandriaDiagnosis || unit.quote,
    guidance: "Name the situation, the action you would take, and why the source idea justifies it.",
  };

  return {
    prompt: difficulty <= 2
      ? "Explain the central idea in your own words."
      : "Reconstruct the central idea and explain why it matters.",
    expected: unit.alexandriaDiagnosis || unit.principle || unit.quote,
    guidance: "Preserve the meaning, not the wording.",
  };
}

export function getKnowledgeChallenge(request: ChallengeRequest = {}): SculptorChallenge | null {
  const excluded = request.excludeUnitIds ?? new Set<string>();
  const candidates = listKnowledgeUnits()
    .filter((unit) => !excluded.has(unit.id))
    .filter((unit) => !request.sourceTitle || request.sourceTitle === "all" || unit.sourceTitle === request.sourceTitle)
    .map((unit) => ({ unit, card: getKnowledgeUnitCard(unit) }))
    .filter((item): item is { unit: KnowledgeUnit; card: RetrievalCard } => Boolean(item.card))
    .filter(({ card }) => !request.dueOnly || card.dueAt <= todayISO())
    .sort((a, b) => scoreUnit(b.unit, b.card, request) - scoreUnit(a.unit, a.card, request));

  const selected = candidates[0];
  if (!selected) return null;

  const difficulty = request.difficulty ?? 1;
  const type = chooseType(selected.unit, request);
  const body = buildPrompt(selected.unit, type, difficulty);
  if (request.recordSurface !== false) recordKnowledgeUnitSurfaced(selected.unit.id);

  return {
    id: `challenge:${selected.unit.id}:${type}`,
    unit: selected.unit,
    card: selected.card,
    type,
    difficulty,
    ...body,
  };
}

export function getKnowledgeChallengeDeck(sourceTitle?: string): KnowledgeUnit[] {
  return listKnowledgeUnits().filter((unit) => !sourceTitle || sourceTitle === "all" || unit.sourceTitle === sourceTitle);
}
