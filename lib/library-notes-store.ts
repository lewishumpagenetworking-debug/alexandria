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
