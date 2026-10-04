export type RetrievalRefType = "capture" | "highlight" | "principle";
export type RetrievalQuality = "blank" | "partial" | "nailed";

export interface RetrievalCard {
  id: string;
  refType: RetrievalRefType;
  refId: string;
  label: string;
  text: string;
  easeFactor: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt?: string;
  reviewCount: number;
  successCount?: number;
  partialCount?: number;
  missCount?: number;
  consecutiveNailed?: number;
  lastQuality?: RetrievalQuality;
  engagementCount?: number;
  lastEngagedAt?: string;
  priorityWeight?: number;
  createdAt: string;
}

const CARDS_KEY = "alexandria-retrieval-cards-v1";
const MIN_EASE = 1.3;
const START_EASE = 2.5;

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function addDays(days: number): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date(Date.now() + days * 86400000));
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

export const listCards = () => read<RetrievalCard[]>(CARDS_KEY, []);

/** Registers a knowledge item for spaced review. A card already tracking the same ref is left untouched. */
export function registerCard(refType: RetrievalRefType, refId: string, label: string, text: string, priorityWeight = 0): RetrievalCard {
  const cards = listCards();
  const existing = cards.find((card) => card.refType === refType && card.refId === refId);
  if (existing) return existing;

  const card: RetrievalCard = {
    id: uid("card"), refType, refId, label, text,
    easeFactor: START_EASE, intervalDays: 1, dueAt: todayISO(), reviewCount: 0, priorityWeight, createdAt: new Date().toISOString(),
  };
  write(CARDS_KEY, [card, ...cards].slice(0, 5000));
  return card;
}

export function findCard(refType: RetrievalRefType, refId: string): RetrievalCard | undefined {
  return listCards().find((card) => card.refType === refType && card.refId === refId);
}

/** Cards due today or overdue, oldest-due first. */
export function getDueRetrievals(limit = 10): RetrievalCard[] {
  const today = todayISO();
  return listCards()
    .filter((card) => card.dueAt <= today)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, limit);
}

export function getDueCount(): number {
  const today = todayISO();
  return listCards().filter((card) => card.dueAt <= today).length;
}

/** Successive-relearning schedule.
 * Misses return quickly; successful retrievals expand through 1, 3, 7, 14, 30, 60, 120, 240 and 365 days.
 * The schedule is intentionally transparent and conservative rather than pretending to estimate a precise forgetting curve.
 */
const SUCCESS_INTERVALS = [1, 3, 7, 14, 30, 60, 120, 240, 365] as const;

export function recordRetrievalScore(cardId: string, quality: RetrievalQuality): RetrievalCard | undefined {
  const cards = listCards();
  const card = cards.find((item) => item.id === cardId);
  if (!card) return undefined;

  let easeFactor = card.easeFactor;
  let intervalDays = card.intervalDays;
  let successCount = card.successCount ?? 0;
  let partialCount = card.partialCount ?? 0;
  let missCount = card.missCount ?? 0;
  let consecutiveNailed = card.consecutiveNailed ?? 0;

  if (quality === "blank") {
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    intervalDays = 1;
    missCount += 1;
    consecutiveNailed = 0;
  } else if (quality === "partial") {
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.05);
    intervalDays = successCount >= 3 ? 2 : 1;
    partialCount += 1;
    consecutiveNailed = 0;
  } else {
    easeFactor = Math.min(3, easeFactor + 0.05);
    successCount += 1;
    consecutiveNailed += 1;
    intervalDays = SUCCESS_INTERVALS[Math.min(successCount - 1, SUCCESS_INTERVALS.length - 1)];
  }

  const updated: RetrievalCard = {
    ...card,
    easeFactor,
    intervalDays,
    successCount,
    partialCount,
    missCount,
    consecutiveNailed,
    lastQuality: quality,
    dueAt: addDays(intervalDays),
    lastReviewedAt: new Date().toISOString(),
    reviewCount: card.reviewCount + 1,
  };
  write(CARDS_KEY, cards.map((item) => (item.id === cardId ? updated : item)));
  return updated;
}

export function retentionScore(card: RetrievalCard): number {
  const successes = card.successCount ?? 0;
  const misses = card.missCount ?? 0;
  const partials = card.partialCount ?? 0;
  const maturity = Math.min(70, successes * 10 + Math.log2(Math.max(1, card.intervalDays)) * 8);
  const penalty = misses * 8 + partials * 3;
  return Math.max(0, Math.min(100, Math.round(maturity - penalty)));
}

export function recordRetrievalScoreByRef(refType: RetrievalRefType, refId: string, quality: RetrievalQuality): RetrievalCard | undefined {
  const card = findCard(refType, refId);
  return card ? recordRetrievalScore(card.id, quality) : undefined;
}


/** Records that a knowledge item was meaningfully worked with outside a scored recall.
 * This prevents the learning queue from immediately serving the same quote again.
 */
export function recordKnowledgeEngagement(refType: RetrievalRefType, refId: string): RetrievalCard | undefined {
  const cards = listCards();
  const card = cards.find((item) => item.refType === refType && item.refId === refId);
  if (!card) return undefined;
  const updated: RetrievalCard = {
    ...card,
    engagementCount: (card.engagementCount ?? 0) + 1,
    lastEngagedAt: new Date().toISOString(),
  };
  write(CARDS_KEY, cards.map((item) => item.id === card.id ? updated : item));
  return updated;
}


/** Removes spaced-review cards for knowledge items that have been deleted or detached. */
export function removeCardsByRefs(refs: Array<{ refType: RetrievalRefType; refId: string }>): number {
  if (!refs.length) return 0;
  const keys = new Set(refs.map((ref) => `${ref.refType}:${ref.refId}`));
  const cards = listCards();
  const next = cards.filter((card) => !keys.has(`${card.refType}:${card.refId}`));
  const removed = cards.length - next.length;
  if (removed > 0) write(CARDS_KEY, next);
  return removed;
}
