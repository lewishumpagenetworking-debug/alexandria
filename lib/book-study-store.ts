import { getHighlightsForSource, getInterpretationsForHighlight, getPrinciplesForHighlight, getPrinciplesForSource } from "@/lib/library-notes-store";
import { findCard, recordKnowledgeEngagement, type RetrievalRefType } from "@/lib/retrieval-store";

export interface BookStudyAnchor {
  sourceId: string;
  sourceTitle: string;
  refType: RetrievalRefType;
  refId: string;
  text: string;
  location?: string;
  interpretation?: string;
  principle?: string;
  relationshipConfidence: "exact" | "book-level" | "none";
}

const LAST_KEY = "alexandria-book-study-last-anchor-v1";

function lastUsedMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || "{}"); } catch { return {}; }
}

function saveLast(sourceId: string, refId: string) {
  if (typeof window === "undefined") return;
  const map = lastUsedMap();
  localStorage.setItem(LAST_KEY, JSON.stringify({ ...map, [sourceId]: refId }));
}

function score(refType: RetrievalRefType, refId: string, sourceId: string): number {
  const card = findCard(refType, refId);
  const last = card?.lastEngagedAt ? new Date(card.lastEngagedAt).getTime() : 0;
  const daysSince = last ? Math.max(0, (Date.now() - last) / 86400000) : 999;
  const unseen = (card?.engagementCount ?? 0) === 0 ? 55 : 0;
  const spacing = Math.min(35, daysSince);
  const priority = card?.priorityWeight ?? 0;
  const repeatPenalty = lastUsedMap()[sourceId] === refId ? 80 : 0;
  const stableJitter = Array.from(refId).reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7) % 17;
  return unseen + spacing + priority + stableJitter - repeatPenalty - Math.min(30, (card?.engagementCount ?? 0) * 5);
}

export function pickBookStudyAnchor(sourceId: string, sourceTitle: string): BookStudyAnchor | null {
  const highlights = getHighlightsForSource(sourceId);
  const principles = getPrinciplesForSource(sourceId);

  const candidates: BookStudyAnchor[] = highlights.map((highlight) => {
    const exactInterpretation = getInterpretationsForHighlight(highlight.id)[0];
    const exactPrinciple = getPrinciplesForHighlight(highlight.id)[0];
    return {
      sourceId,
      sourceTitle,
      refType: "highlight" as const,
      refId: highlight.id,
      text: highlight.text,
      location: highlight.location,
      interpretation: exactInterpretation?.text,
      principle: exactPrinciple?.statement,
      relationshipConfidence: exactInterpretation || exactPrinciple ? "exact" as const : "none" as const,
    };
  });

  if (!candidates.length) {
    candidates.push(...principles.map((principle) => ({
      sourceId,
      sourceTitle,
      refType: "principle" as const,
      refId: principle.id,
      text: principle.statement,
      principle: principle.statement,
      relationshipConfidence: "exact" as const,
    })));
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => score(b.refType, b.refId, sourceId) - score(a.refType, a.refId, sourceId));
  const chosen = candidates[0];

  // Older imports did not preserve row-level links. A book-level principle may still be
  // useful context, but label it as such rather than pretending it came from this exact quote.
  if (!chosen.principle && principles.length) {
    chosen.principle = principles[0].statement;
    chosen.relationshipConfidence = "book-level";
  }

  saveLast(sourceId, chosen.refId);
  return chosen;
}

export function markBookStudyAnchorEngaged(anchor: BookStudyAnchor) {
  recordKnowledgeEngagement(anchor.refType, anchor.refId);
  saveLast(anchor.sourceId, anchor.refId);
}
