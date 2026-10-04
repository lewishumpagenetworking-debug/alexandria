import { loadBooks } from "./application-store";

interface StoredMetaRecord {
  responses?: string[];
  step?: number;
}

export interface BookMemoryContext {
  sourceId: string;
  sourceTitle: string;
  sourceCreator: string;
  completed: boolean;
  hasBreakdown: boolean;
  recall?: string;
  diagnosis?: string;
  reduction?: string;
  reconstruction?: string;
  application?: string;
  primary: string;
}

function readMeta(sourceId: string): StoredMetaRecord {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(`alexandria-book-meta-v1:${sourceId}`) || "null") ?? {};
  } catch {
    return {};
  }
}

export function getBookMemoryContext(sourceId: string): BookMemoryContext | null {
  const book = loadBooks({ includeArchived: true, includeDeleted: false }).find((item) => item.id === sourceId);
  if (!book) return null;

  const record = readMeta(sourceId);
  const responses = Array.isArray(record.responses) ? record.responses : [];
  const recall = responses[0]?.trim() || undefined;
  const diagnosis = responses[1]?.trim() || undefined;
  const reduction = responses[2]?.trim() || undefined;
  const reconstruction = responses[3]?.trim() || undefined;
  const application = responses[4]?.trim() || undefined;
  const primary = reconstruction || diagnosis || reduction || recall || "No book-level breakdown has been saved yet. Use the title, author, and passage location as your context anchor.";

  return {
    sourceId,
    sourceTitle: book.title,
    sourceCreator: book.author,
    completed: book.completed,
    hasBreakdown: Boolean(recall || diagnosis || reduction || reconstruction || application),
    recall,
    diagnosis,
    reduction,
    reconstruction,
    application,
    primary,
  };
}
