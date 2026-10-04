import { loadBooks } from "./application-store";
import { BOOK_CATEGORIES, sourceCategory } from "./book-categories";
import { getKnowledgeUnitCard, listKnowledgeUnits } from "./knowledge-unit-store";
import { retentionScore, type RetrievalQuality } from "./retrieval-store";
import type { KnowledgeUnit } from "@/models/domain";

export type MemoryScope = "mixed" | "book" | "context";
export type MemoryDirection = "forward" | "reverse";

export interface DailyMemoryPlan {
  date: string;
  targetMinutes: number;
  scope: MemoryScope;
  direction: MemoryDirection;
  focusBookId?: string;
  focusBookTitle?: string;
  focusContext?: string;
  intensive: boolean;
  reason: string;
  cycleDay: number;
  poolCount: number;
}

export interface MemoryDeckRequest {
  sourceId?: string;
  context?: string;
  direction?: MemoryDirection;
  adaptive?: boolean;
}

export interface MemorySession {
  id: string;
  date: string;
  startedAt: string;
  targetMinutes: number;
  scope: MemoryScope;
  direction: MemoryDirection;
  focusBookId?: string;
  focusBookTitle?: string;
  focusContext?: string;
  reviewed: number;
  nailed: number;
  partial: number;
  blank: number;
  activeSeconds?: number;
  completedAt?: string;
}

interface MemoryCycleState {
  librarySignature: string;
  cycleStartedAt: string;
}

const CYCLE_KEY = "alexandria-memory-cycle-v1";
const SESSIONS_KEY = "alexandria-memory-sessions-v1";
export const DEFAULT_MEMORY_MINUTES = 10;
export const MIN_DAILY_REVIEWS = 5;

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("alexandria:data"));
}

function parseDay(day: string) {
  return new Date(`${day}T12:00:00Z`).getTime();
}

function daysBetween(from: string, to: string) {
  return Math.max(0, Math.floor((parseDay(to) - parseDay(from)) / 86400000));
}

function contextsForUnit(unit: KnowledgeUnit): string[] {
  const explicit = (unit.contextTags ?? []).map((item) => item.trim()).filter(Boolean);
  if (explicit.length) return [...new Set(explicit)];
  const category = sourceCategory(unit.sourceId, unit.sourceTitle);
  return [BOOK_CATEGORIES[category]];
}

function librarySignature() {
  const counts = new Map<string, number>();
  for (const unit of listKnowledgeUnits()) counts.set(unit.sourceId, (counts.get(unit.sourceId) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => `${id}:${count}`).join("|");
}

function ensureCycleState(): MemoryCycleState {
  const signature = librarySignature();
  const current = read<MemoryCycleState | null>(CYCLE_KEY, null);
  if (!current || current.librarySignature !== signature) {
    const reset = { librarySignature: signature, cycleStartedAt: todayISO() };
    write(CYCLE_KEY, reset);
    return reset;
  }
  return current;
}

export const listMemorySessions = () => read<MemorySession[]>(SESSIONS_KEY, []);

export function getTodayMemorySession(): MemorySession | null {
  const sessions = listMemorySessions().filter((session) => session.date === todayISO());
  return sessions.find((session) => !session.completedAt) ?? sessions[0] ?? null;
}

export function isTodayMemoryComplete(): boolean {
  return listMemorySessions().some((session) => session.date === todayISO() && Boolean(session.completedAt));
}

export function memorySessionElapsedSeconds(session: MemorySession): number {
  if (typeof session.activeSeconds === "number") return Math.max(0, Math.floor(session.activeSeconds));
  const end = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  return Math.max(0, Math.floor((end - new Date(session.startedAt).getTime()) / 1000));
}

export function memorySessionRemainingSeconds(session: MemorySession): number {
  return Math.max(0, session.targetMinutes * 60 - memorySessionElapsedSeconds(session));
}

function lastFocusedBookAt(bookId: string): number {
  const match = listMemorySessions().find((session) => session.focusBookId === bookId && session.completedAt);
  return match?.completedAt ? new Date(match.completedAt).getTime() : 0;
}

function lastFocusedContextAt(context: string): number {
  const match = listMemorySessions().find((session) => session.focusContext === context && session.completedAt);
  return match?.completedAt ? new Date(match.completedAt).getTime() : 0;
}

function unitRetention(unit: KnowledgeUnit): number {
  const card = getKnowledgeUnitCard(unit);
  return card ? retentionScore(card) : 0;
}

function chooseFocusBook(units: KnowledgeUnit[]) {
  const books = loadBooks({ includeArchived: true, includeDeleted: false });
  const candidates = books.flatMap((book) => {
    const bookUnits = units.filter((unit) => unit.sourceId === book.id);
    if (!bookUnits.length) return [];
    const scores = bookUnits.map(unitRetention);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const missed = bookUnits.filter((unit) => getKnowledgeUnitCard(unit)?.lastQuality === "blank").length / bookUnits.length;
    const newRatio = bookUnits.filter((unit) => (getKnowledgeUnitCard(unit)?.reviewCount ?? 0) === 0).length / bookUnits.length;
    const last = lastFocusedBookAt(book.id);
    const daysSinceFocus = last ? (Date.now() - last) / 86400000 : 999;
    const priority = (100 - average) * .55 + missed * 24 + newRatio * 16 + Math.min(18, daysSinceFocus / 4);
    return [{ book, average, missed, priority, count: bookUnits.length }];
  });
  return candidates.sort((a, b) => b.priority - a.priority)[0];
}

function chooseFocusContext(units: KnowledgeUnit[]) {
  const map = new Map<string, KnowledgeUnit[]>();
  for (const unit of units) {
    for (const context of contextsForUnit(unit)) {
      const bucket = map.get(context) ?? [];
      bucket.push(unit);
      map.set(context, bucket);
    }
  }
  return [...map.entries()].map(([context, contextUnits]) => {
    const average = contextUnits.reduce((sum, unit) => sum + unitRetention(unit), 0) / contextUnits.length;
    const missRatio = contextUnits.filter((unit) => getKnowledgeUnitCard(unit)?.lastQuality === "blank").length / contextUnits.length;
    const last = lastFocusedContextAt(context);
    const daysSinceFocus = last ? (Date.now() - last) / 86400000 : 999;
    return {
      context,
      count: contextUnits.length,
      priority: (100 - average) * .55 + missRatio * 22 + Math.min(20, daysSinceFocus / 4),
    };
  }).sort((a, b) => b.priority - a.priority)[0];
}

function reverseEligible(unit: KnowledgeUnit) {
  return Boolean(unit.maxim || unit.principle || unit.action || unit.alexandriaDiagnosis);
}

export function getMemoryContexts(): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const unit of listKnowledgeUnits()) {
    for (const context of contextsForUnit(unit)) counts.set(context, (counts.get(context) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => a.label.localeCompare(b.label));
}

export function getDailyMemoryPlan(): DailyMemoryPlan {
  const units = listKnowledgeUnits();
  const cycle = ensureCycleState();
  const cycleDay = daysBetween(cycle.cycleStartedAt, todayISO());
  const weekday = cycleDay % 7;
  const focusBook = chooseFocusBook(units);
  const focusContext = chooseFocusContext(units);
  const intensive = Boolean(focusBook && (focusBook.average < 35 || focusBook.missed >= .35));

  let scope: MemoryScope;
  let direction: MemoryDirection = "forward";

  if (intensive) {
    // A genuinely weak book receives a full relearning week rather than being diluted by interleaving.
    scope = "book";
    if (weekday === 2 || weekday === 5) direction = "reverse";
  } else {
    const pattern: Array<{ scope: MemoryScope; direction: MemoryDirection }> = [
      { scope: "book", direction: "forward" },
      { scope: "mixed", direction: "forward" },
      { scope: "book", direction: "reverse" },
      { scope: "context", direction: "forward" },
      { scope: "mixed", direction: "reverse" },
      { scope: "book", direction: "forward" },
      { scope: "mixed", direction: "forward" },
    ];
    ({ scope, direction } = pattern[weekday]);
  }

  let filtered = units;
  if (scope === "book" && focusBook) filtered = units.filter((unit) => unit.sourceId === focusBook.book.id);
  if (scope === "context" && focusContext) filtered = units.filter((unit) => contextsForUnit(unit).includes(focusContext.context));
  if (direction === "reverse" && filtered.filter(reverseEligible).length < Math.min(3, filtered.length)) direction = "forward";

  const reason = scope === "book" && focusBook
    ? `${intensive ? "Intensive relearning" : "Focused relearning"}: ${focusBook.book.title} currently has the weakest/least-rehearsed memory profile.`
    : scope === "context" && focusContext
      ? `Context consolidation: ${focusContext.context} is due for a focused pass across sources.`
      : direction === "reverse"
        ? "Mixed reverse retrieval: recall the source idea from a maxim, action, principle or interpretation."
        : "Mixed interleaving: discriminate and retrieve ideas across the wider Library.";

  return {
    date: todayISO(),
    targetMinutes: DEFAULT_MEMORY_MINUTES,
    scope,
    direction,
    focusBookId: scope === "book" ? focusBook?.book.id : undefined,
    focusBookTitle: scope === "book" ? focusBook?.book.title : undefined,
    focusContext: scope === "context" ? focusContext?.context : undefined,
    intensive,
    reason,
    cycleDay,
    poolCount: filtered.length,
  };
}

function unitPriority(unit: KnowledgeUnit): number {
  const card = getKnowledgeUnitCard(unit);
  if (!card) return -999;
  const today = todayISO();
  const due = card.dueAt <= today ? 42 : 0;
  const newBonus = card.reviewCount === 0 ? 34 : 0;
  const missBonus = card.lastQuality === "blank" ? 34 : card.lastQuality === "partial" ? 15 : 0;
  const weakness = Math.max(0, 100 - retentionScore(card)) * .35;
  const daysSince = card.lastReviewedAt ? Math.max(0, (Date.now() - new Date(card.lastReviewedAt).getTime()) / 86400000) : 40;
  const spacing = Math.min(24, daysSince);
  const priority = (card.priorityWeight ?? 0) + unit.priority * 4;
  const reviewedTodayPenalty = card.lastReviewedAt?.slice(0, 10) === today ? 80 : 0;
  return due + newBonus + missBonus + weakness + spacing + priority - reviewedTodayPenalty + Math.random() * 7;
}

function interleaveBySource(units: KnowledgeUnit[]): KnowledgeUnit[] {
  const buckets = new Map<string, KnowledgeUnit[]>();
  for (const unit of units) {
    const bucket = buckets.get(unit.sourceId) ?? [];
    bucket.push(unit);
    buckets.set(unit.sourceId, bucket);
  }
  const orderedBuckets = [...buckets.values()].sort((a, b) => b.length - a.length);
  const result: KnowledgeUnit[] = [];
  let lastSource = "";
  while (orderedBuckets.some((bucket) => bucket.length)) {
    const candidates = orderedBuckets.filter((bucket) => bucket.length && bucket[0].sourceId !== lastSource);
    const bucket = candidates[0] ?? orderedBuckets.find((item) => item.length);
    if (!bucket) break;
    const next = bucket.shift()!;
    result.push(next);
    lastSource = next.sourceId;
    orderedBuckets.sort((a, b) => b.length - a.length);
  }
  return result;
}

export function buildMemoryDeck(request: MemoryDeckRequest = {}, limit = 50): KnowledgeUnit[] {
  const plan = getDailyMemoryPlan();
  const units = listKnowledgeUnits();
  const sourceId = request.sourceId ?? (request.adaptive !== false && plan.scope === "book" ? plan.focusBookId : undefined);
  const context = request.context ?? (request.adaptive !== false && plan.scope === "context" ? plan.focusContext : undefined);
  const direction = request.direction ?? (request.adaptive !== false ? plan.direction : "forward");

  let pool = units
    .filter((unit) => !sourceId || unit.sourceId === sourceId)
    .filter((unit) => !context || contextsForUnit(unit).includes(context))
    .filter((unit) => direction !== "reverse" || reverseEligible(unit))
    .sort((a, b) => unitPriority(b) - unitPriority(a));

  if (!sourceId && !context) pool = interleaveBySource(pool);
  return pool.slice(0, limit);
}

export function startMemorySession(plan: DailyMemoryPlan = getDailyMemoryPlan(), override?: { scope?: MemoryScope; sourceId?: string; sourceTitle?: string; context?: string; direction?: MemoryDirection }): MemorySession {
  const session: MemorySession = {
    id: `memory-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    date: todayISO(),
    startedAt: new Date().toISOString(),
    targetMinutes: plan.targetMinutes,
    scope: override?.scope ?? (override?.sourceId ? "book" : override?.context ? "context" : plan.scope),
    direction: override?.direction ?? plan.direction,
    focusBookId: override?.sourceId ?? plan.focusBookId,
    focusBookTitle: override?.sourceTitle ?? plan.focusBookTitle,
    focusContext: override?.context ?? plan.focusContext,
    reviewed: 0,
    nailed: 0,
    partial: 0,
    blank: 0,
    activeSeconds: 0,
  };
  write(SESSIONS_KEY, [session, ...listMemorySessions()].slice(0, 1000));
  return session;
}

export function addMemorySessionActiveSeconds(sessionId: string, seconds: number): MemorySession | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return listMemorySessions().find((item) => item.id === sessionId) ?? null;
  const sessions = listMemorySessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session || session.completedAt) return session ?? null;
  const updated = { ...session, activeSeconds: (session.activeSeconds ?? 0) + seconds };
  write(SESSIONS_KEY, sessions.map((item) => item.id === sessionId ? updated : item));
  return updated;
}

export function recordMemorySessionReview(sessionId: string, quality: RetrievalQuality): MemorySession | null {
  const sessions = listMemorySessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  const updated: MemorySession = {
    ...session,
    reviewed: session.reviewed + 1,
    nailed: session.nailed + (quality === "nailed" ? 1 : 0),
    partial: session.partial + (quality === "partial" ? 1 : 0),
    blank: session.blank + (quality === "blank" ? 1 : 0),
  };
  write(SESSIONS_KEY, sessions.map((item) => item.id === sessionId ? updated : item));
  return updated;
}

export function completeMemorySession(sessionId: string): { session: MemorySession | null; completed: boolean; remainingSeconds: number } {
  const sessions = listMemorySessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return { session: null, completed: false, remainingSeconds: 0 };
  const remainingSeconds = memorySessionRemainingSeconds(session);
  if (remainingSeconds > 0 || session.reviewed < MIN_DAILY_REVIEWS) {
    return { session, completed: false, remainingSeconds };
  }
  if (session.completedAt) return { session, completed: true, remainingSeconds: 0 };
  const updated = { ...session, completedAt: new Date().toISOString() };
  write(SESSIONS_KEY, sessions.map((item) => item.id === sessionId ? updated : item));
  return { session: updated, completed: true, remainingSeconds: 0 };
}
