import { loadBooks } from "@/lib/application-store";
import { listHighlights, listInterpretations, listPrinciples } from "@/lib/library-notes-store";
import { findCard, type RetrievalCard, type RetrievalQuality } from "@/lib/retrieval-store";
import type { KnowledgeAttempt, KnowledgeUnit, KnowledgeUnitMastery } from "@/models/domain";

type KnowledgeUnitOverlay = {
  knowledgeUnitId: string;
  assumptions?: string[];
  fundamentals?: string[];
  boundaries?: string[];
  counterarguments?: string[];
  ifTrigger?: string;
  thenAction?: string;
  rationale?: string;
  situationTags?: string[];
  diagnosisHistory?: KnowledgeAttempt[];
  lastSurfacedAt?: string;
  timesSurfaced?: number;
};

const OVERLAY_KEY = "alexandria-knowledge-unit-overlays-v1";

function readOverlays(): KnowledgeUnitOverlay[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(OVERLAY_KEY) || "[]") as KnowledgeUnitOverlay[]; }
  catch { return []; }
}

function writeOverlays(items: KnowledgeUnitOverlay[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(items.slice(0, 5000)));
  window.dispatchEvent(new Event("alexandria:data"));
}

function masteryFromCard(card?: RetrievalCard): KnowledgeUnitMastery {
  const reviews = card?.reviewCount ?? 0;
  const interval = card?.intervalDays ?? 1;
  const strength = Math.max(0, Math.min(100, Math.round(
    (reviews === 0 ? 10 : 28) +
    Math.min(42, reviews * 6) +
    Math.min(30, Math.log2(Math.max(1, interval)) * 8)
  )));
  return {
    state: reviews === 0 ? "captured" : interval >= 14 ? "integrated" : interval >= 3 ? "understood" : "retrieving",
    strength,
    reviewCount: reviews,
    successCount: 0,
    partialCount: 0,
    missCount: 0,
    nextReviewAt: card?.dueAt,
    lastReviewedAt: card?.lastReviewedAt,
    intervalDays: interval,
    easeFactor: card?.easeFactor ?? 2.5,
  };
}

export function listKnowledgeUnits(): KnowledgeUnit[] {
  const books = loadBooks({ includeArchived: true, includeDeleted: true });
  const highlights = listHighlights();
  const interpretations = listInterpretations();
  const principles = listPrinciples();
  const overlays = readOverlays();

  return highlights.map((highlight) => {
    const book = books.find((item) => item.id === highlight.sourceId);
    const interpretation = interpretations.find((item) => item.highlightId === highlight.id);
    const principle = principles.find((item) => item.highlightId === highlight.id);
    const card = findCard("highlight", highlight.id);
    const unitId = `ku:${highlight.id}`;
    const overlay = overlays.find((item) => item.knowledgeUnitId === unitId);

    return {
      id: unitId,
      sourceId: highlight.sourceId,
      sourceTitle: book?.title ?? card?.label ?? "Unknown source",
      sourceCreator: book?.author,
      location: highlight.location,
      quote: highlight.text,
      highlightId: highlight.id,
      interpretationId: interpretation?.id,
      principleId: principle?.id,
      alexandriaDiagnosis: interpretation?.text,
      scholarName: interpretation?.scholarName,
      scholarBasis: interpretation?.scholarBasis,
      scholarSourceTitle: interpretation?.scholarSourceTitle,
      scholarSourceUrl: interpretation?.scholarSourceUrl,
      scholarConfidence: interpretation?.scholarConfidence,
      principle: principle?.statement,
      principleExplanation: principle?.explanation,
      assumptions: overlay?.assumptions ?? [],
      fundamentals: overlay?.fundamentals ?? [],
      boundaries: overlay?.boundaries ?? [],
      counterarguments: overlay?.counterarguments ?? [],
      ifTrigger: overlay?.ifTrigger,
      thenAction: overlay?.thenAction,
      rationale: overlay?.rationale,
      situationTags: overlay?.situationTags ?? [],
      diagnosisHistory: overlay?.diagnosisHistory ?? [],
      mastery: masteryFromCard(card),
      priority: Math.round((card?.priorityWeight ?? 0) / 8),
      lastSurfacedAt: overlay?.lastSurfacedAt ?? card?.lastEngagedAt,
      timesSurfaced: overlay?.timesSurfaced ?? card?.engagementCount ?? 0,
      createdAt: highlight.capturedAt,
    };
  });
}

export function getKnowledgeUnit(id: string): KnowledgeUnit | undefined {
  return listKnowledgeUnits().find((unit) => unit.id === id);
}

export function getKnowledgeUnitByHighlight(highlightId: string): KnowledgeUnit | undefined {
  return listKnowledgeUnits().find((unit) => unit.highlightId === highlightId);
}

export function getKnowledgeUnitCard(unit: KnowledgeUnit): RetrievalCard | undefined {
  return unit.highlightId ? findCard("highlight", unit.highlightId) : undefined;
}

export function updateKnowledgeUnitOverlay(unitId: string, patch: Omit<Partial<KnowledgeUnitOverlay>, "knowledgeUnitId">) {
  const all = readOverlays();
  const current = all.find((item) => item.knowledgeUnitId === unitId) ?? { knowledgeUnitId: unitId };
  const updated = { ...current, ...patch, knowledgeUnitId: unitId };
  writeOverlays([updated, ...all.filter((item) => item.knowledgeUnitId !== unitId)]);
}

export function recordKnowledgeUnitSurfaced(unitId: string) {
  const unit = getKnowledgeUnit(unitId);
  updateKnowledgeUnitOverlay(unitId, {
    lastSurfacedAt: new Date().toISOString(),
    timesSurfaced: (unit?.timesSurfaced ?? 0) + 1,
  });
}

export function applyKnowledgeUnitReviewResult(unitId: string, quality: RetrievalQuality) {
  const unit = getKnowledgeUnit(unitId);
  if (!unit) return;
  const nextState = quality === "nailed"
    ? (unit.mastery.intervalDays >= 7 ? "integrated" : "understood")
    : "retrieving";
  // Mastery scheduling remains canonical in retrieval-store for Migration 1.
  // This overlay intentionally stores only non-duplicated Sculptor metadata.
  updateKnowledgeUnitOverlay(unitId, { lastSurfacedAt: new Date().toISOString() });
  return nextState;
}


export function recordKnowledgeAttempt(unitId: string, attempt: Omit<KnowledgeAttempt, "id" | "createdAt">): KnowledgeAttempt | undefined {
  const unit = getKnowledgeUnit(unitId);
  if (!unit) return undefined;
  const saved: KnowledgeAttempt = {
    ...attempt,
    id: `attempt-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  updateKnowledgeUnitOverlay(unitId, {
    diagnosisHistory: [saved, ...unit.diagnosisHistory].slice(0, 250),
    lastSurfacedAt: new Date().toISOString(),
  });
  return saved;
}


/** Removes Sculptor overlays for deleted highlights so stale attempts cannot survive a source correction. */
export function removeKnowledgeUnitOverlaysByHighlightIds(highlightIds: string[]): number {
  if (!highlightIds.length) return 0;
  const ids = new Set(highlightIds.map((id) => `ku:${id}`));
  const overlays = readOverlays();
  const next = overlays.filter((item) => !ids.has(item.knowledgeUnitId));
  const removed = overlays.length - next.length;
  if (removed > 0) writeOverlays(next);
  return removed;
}
