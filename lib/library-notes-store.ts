import type { Highlight, Interpretation, Principle } from "@/models/domain";

const HIGHLIGHTS_KEY = "alexandria-highlights-v1";
const INTERPRETATIONS_KEY = "alexandria-interpretations-v1";
const PRINCIPLES_KEY = "alexandria-principles-v1";

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

export const listHighlights = () => read<Highlight[]>(HIGHLIGHTS_KEY, []);

export function addHighlight(input: Omit<Highlight, "id" | "capturedAt">): Highlight {
  const highlight: Highlight = { ...input, id: uid("highlight"), capturedAt: new Date().toISOString() };
  write(HIGHLIGHTS_KEY, [highlight, ...listHighlights()].slice(0, 5000));
  return highlight;
}

export const getHighlightsForSource = (sourceId: string) => listHighlights().filter((item) => item.sourceId === sourceId);

export const listInterpretations = () => read<Interpretation[]>(INTERPRETATIONS_KEY, []);
export const getInterpretationsForSource = (sourceId: string) => listInterpretations().filter((item) => item.sourceId === sourceId);
export const getInterpretationsForHighlight = (highlightId: string) => listInterpretations().filter((item) => item.highlightId === highlightId);

export function addInterpretation(input: Omit<Interpretation, "id" | "createdAt">): Interpretation {
  const interpretation: Interpretation = { ...input, id: uid("interpretation"), createdAt: new Date().toISOString() };
  write(INTERPRETATIONS_KEY, [interpretation, ...listInterpretations()].slice(0, 5000));
  return interpretation;
}

export const listPrinciples = () => read<Principle[]>(PRINCIPLES_KEY, []);

export function addPrinciple(input: Omit<Principle, "id">): Principle {
  const principle: Principle = { ...input, id: uid("principle") };
  write(PRINCIPLES_KEY, [principle, ...listPrinciples()].slice(0, 5000));
  return principle;
}

export const getPrinciplesForSource = (sourceId: string) => listPrinciples().filter((item) => item.sourceIds.includes(sourceId));
export const getPrinciplesForHighlight = (highlightId: string) => listPrinciples().filter((item) => item.highlightId === highlightId);

export const getPrinciplesForHall = (hallId: string) => listPrinciples().filter((item) => item.hallIds?.includes(hallId));


export interface SourceNoteRemovalResult {
  highlightIds: string[];
  principleIds: string[];
  interpretationsRemoved: number;
  principlesDetached: number;
}

function emptyRemoval(): SourceNoteRemovalResult {
  return { highlightIds: [], principleIds: [], interpretationsRemoved: 0, principlesDetached: 0 };
}

/** Removes one highlight plus its book-specific interpretation and principle links. */
export function removeHighlightFromSource(sourceId: string, highlightId: string): SourceNoteRemovalResult {
  const highlight = listHighlights().find((item) => item.id === highlightId && item.sourceId === sourceId);
  if (!highlight) return emptyRemoval();

  const interpretations = listInterpretations();
  const principles = listPrinciples();
  const linkedPrinciples = principles.filter((item) => item.highlightId === highlightId || item.sourceIds.includes(sourceId) && item.highlightId === highlightId);
  const result: SourceNoteRemovalResult = {
    highlightIds: [highlightId],
    principleIds: [],
    interpretationsRemoved: interpretations.filter((item) => item.highlightId === highlightId || item.sourceId === sourceId && item.highlightId === highlightId).length,
    principlesDetached: 0,
  };

  write(HIGHLIGHTS_KEY, listHighlights().filter((item) => item.id !== highlightId));
  write(INTERPRETATIONS_KEY, interpretations.filter((item) => item.highlightId !== highlightId));

  const nextPrinciples = principles.flatMap((item) => {
    if (!linkedPrinciples.some((linked) => linked.id === item.id)) return [item];
    const remainingSources = item.sourceIds.filter((id) => id !== sourceId);
    if (remainingSources.length === 0) {
      result.principleIds.push(item.id);
      return [];
    }
    result.principlesDetached++;
    return [{ ...item, sourceIds: remainingSources, highlightId: undefined }];
  });
  write(PRINCIPLES_KEY, nextPrinciples);
  return result;
}

/** Detaches a principle from one source; deletes it only when no source remains. */
export function removePrincipleFromSource(sourceId: string, principleId: string): SourceNoteRemovalResult {
  const principles = listPrinciples();
  const principle = principles.find((item) => item.id === principleId && item.sourceIds.includes(sourceId));
  if (!principle) return emptyRemoval();
  const remainingSources = principle.sourceIds.filter((id) => id !== sourceId);
  if (remainingSources.length === 0) {
    write(PRINCIPLES_KEY, principles.filter((item) => item.id !== principleId));
    return { ...emptyRemoval(), principleIds: [principleId] };
  }
  write(PRINCIPLES_KEY, principles.map((item) => item.id === principleId
    ? { ...item, sourceIds: remainingSources, highlightId: item.highlightId && getHighlightsForSource(sourceId).some((highlight) => highlight.id === item.highlightId) ? undefined : item.highlightId }
    : item));
  return { ...emptyRemoval(), principlesDetached: 1 };
}

/** Clears all rich notes assigned to a source while preserving principles that are shared with other sources. */
export function clearNotesForSource(sourceId: string): SourceNoteRemovalResult {
  const highlights = listHighlights();
  const interpretations = listInterpretations();
  const principles = listPrinciples();
  const sourceHighlightIds = new Set(highlights.filter((item) => item.sourceId === sourceId).map((item) => item.id));
  const result: SourceNoteRemovalResult = {
    highlightIds: [...sourceHighlightIds],
    principleIds: [],
    interpretationsRemoved: interpretations.filter((item) => item.sourceId === sourceId || (item.highlightId ? sourceHighlightIds.has(item.highlightId) : false)).length,
    principlesDetached: 0,
  };

  write(HIGHLIGHTS_KEY, highlights.filter((item) => item.sourceId !== sourceId));
  write(INTERPRETATIONS_KEY, interpretations.filter((item) => item.sourceId !== sourceId && !(item.highlightId && sourceHighlightIds.has(item.highlightId))));

  const nextPrinciples = principles.flatMap((item) => {
    if (!item.sourceIds.includes(sourceId)) return [item];
    const remainingSources = item.sourceIds.filter((id) => id !== sourceId);
    if (remainingSources.length === 0) {
      result.principleIds.push(item.id);
      return [];
    }
    result.principlesDetached++;
    return [{ ...item, sourceIds: remainingSources, highlightId: item.highlightId && sourceHighlightIds.has(item.highlightId) ? undefined : item.highlightId }];
  });
  write(PRINCIPLES_KEY, nextPrinciples);
  return result;
}
