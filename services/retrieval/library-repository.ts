import type { Highlight, Principle, Source } from "@/models/domain";

export interface LibraryRepository {
  getSource(id: string): Promise<Source | null>;
  searchSources(query: string): Promise<Source[]>;
  getBookNotes(bookId: string): Promise<Highlight[]>;
  getHighlights(sourceId: string): Promise<Highlight[]>;
  getPrinciple(id: string): Promise<Principle | null>;
  findRelatedPrinciples(principleId: string): Promise<Principle[]>;
}
