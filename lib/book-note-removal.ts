import { loadBooks, saveBooks } from "@/lib/application-store";
import { removeImportedCapturesForBook } from "@/lib/capture-store";
import {
  clearNotesForSource,
  getHighlightsForSource,
  getPrinciplesForSource,
  removeHighlightFromSource,
  removePrincipleFromSource,
} from "@/lib/library-notes-store";
import { removeKnowledgeUnitOverlaysByHighlightIds } from "@/lib/knowledge-unit-store";
import { removeCardsByRefs } from "@/lib/retrieval-store";

export type BookNoteRemovalSummary = {
  highlightsRemoved: number;
  principlesRemoved: number;
  principlesDetached: number;
  interpretationsRemoved: number;
  importedQuestionsRemoved: number;
};

function removeFirstOccurrence(items: string[], value: string): string[] {
  const index = items.indexOf(value);
  return index < 0 ? items : [...items.slice(0, index), ...items.slice(index + 1)];
}

function syncBookNoteCounts(bookId: string, nextHighlights?: string[]) {
  const books = loadBooks({ includeArchived: true, includeDeleted: true });
  saveBooks(books.map((book) => book.id === bookId ? {
    ...book,
    highlights: nextHighlights ?? book.highlights,
    principles: getPrinciplesForSource(bookId).length,
  } : book));
}

export function deleteBookHighlight(bookId: string, highlightId: string): BookNoteRemovalSummary {
  const book = loadBooks({ includeArchived: true, includeDeleted: true }).find((item) => item.id === bookId);
  const highlight = getHighlightsForSource(bookId).find((item) => item.id === highlightId);
  if (!book || !highlight) return { highlightsRemoved: 0, principlesRemoved: 0, principlesDetached: 0, interpretationsRemoved: 0, importedQuestionsRemoved: 0 };

  const result = removeHighlightFromSource(bookId, highlightId);
  removeCardsByRefs([
    ...result.highlightIds.map((refId) => ({ refType: "highlight" as const, refId })),
    ...result.principleIds.map((refId) => ({ refType: "principle" as const, refId })),
  ]);
  removeKnowledgeUnitOverlaysByHighlightIds(result.highlightIds);
  syncBookNoteCounts(bookId, removeFirstOccurrence(book.highlights, highlight.text));
  window.dispatchEvent(new Event("alexandria:data"));

  return {
    highlightsRemoved: result.highlightIds.length,
    principlesRemoved: result.principleIds.length,
    principlesDetached: result.principlesDetached,
    interpretationsRemoved: result.interpretationsRemoved,
    importedQuestionsRemoved: 0,
  };
}

export function deleteBookPrinciple(bookId: string, principleId: string): BookNoteRemovalSummary {
  const result = removePrincipleFromSource(bookId, principleId);
  removeCardsByRefs(result.principleIds.map((refId) => ({ refType: "principle" as const, refId })));
  syncBookNoteCounts(bookId);
  window.dispatchEvent(new Event("alexandria:data"));
  return {
    highlightsRemoved: 0,
    principlesRemoved: result.principleIds.length,
    principlesDetached: result.principlesDetached,
    interpretationsRemoved: 0,
    importedQuestionsRemoved: 0,
  };
}

export function clearBookKnowledge(bookId: string): BookNoteRemovalSummary {
  const book = loadBooks({ includeArchived: true, includeDeleted: true }).find((item) => item.id === bookId);
  if (!book) return { highlightsRemoved: 0, principlesRemoved: 0, principlesDetached: 0, interpretationsRemoved: 0, importedQuestionsRemoved: 0 };

  const result = clearNotesForSource(bookId);
  removeCardsByRefs([
    ...result.highlightIds.map((refId) => ({ refType: "highlight" as const, refId })),
    ...result.principleIds.map((refId) => ({ refType: "principle" as const, refId })),
  ]);
  removeKnowledgeUnitOverlaysByHighlightIds(result.highlightIds);
  const importedQuestionsRemoved = removeImportedCapturesForBook(book.title);

  const books = loadBooks({ includeArchived: true, includeDeleted: true });
  saveBooks(books.map((item) => item.id === bookId ? {
    ...item,
    highlights: [],
    principles: getPrinciplesForSource(bookId).length,
  } : item));
  window.dispatchEvent(new Event("alexandria:data"));

  return {
    highlightsRemoved: result.highlightIds.length,
    principlesRemoved: result.principleIds.length,
    principlesDetached: result.principlesDetached,
    interpretationsRemoved: result.interpretationsRemoved,
    importedQuestionsRemoved,
  };
}
