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
  engagementCount?: number;
  lastEngagedAt?: string;
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
export function registerCard(refType: RetrievalRefType, refId: string, label: string, text: string): RetrievalCard {
  const cards = listCards();
  const existing = cards.find((card) => card.refType === refType && card.refId === refId);
  if (existing) return existing;

  const card: RetrievalCard = {
    id: uid("card"), refType, refId, label, text,
    easeFactor: START_EASE, intervalDays: 1, dueAt: todayISO(), reviewCount: 0, createdAt: new Date().toISOString(),
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

/** SM-2-lite: quality moves the interval and ease factor; a blank review resets the interval. */
export function recordRetrievalScore(cardId: string, quality: RetrievalQuality): RetrievalCard | undefined {
  const cards = listCards();
  const card = cards.find((item) => item.id === cardId);
  if (!card) return undefined;

  let { easeFactor, intervalDays } = card;
  if (quality === "blank") {
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    intervalDays = 1;
  } else if (quality === "partial") {
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.05);
    intervalDays = Math.max(1, Math.round(intervalDays * 1.3));
  } else {
    easeFactor = Math.min(3, easeFactor + 0.1);
    intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
  }

  const updated: RetrievalCard = {
    ...card, easeFactor, intervalDays,
    dueAt: addDays(intervalDays), lastReviewedAt: new Date().toISOString(), reviewCount: card.reviewCount + 1,
  };
  write(CARDS_KEY, cards.map((item) => (item.id === cardId ? updated : item)));
  return updated;
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
