import type {
  AgoraSession,
  Connection,
  ForumSession,
  Interpretation,
  Principle,
  Question,
  Source,
} from "@/models/domain";

export interface SearchResult<T> {
  item: T;
  score: number;
  reason?: string;
}

export interface AlexandriaAIService {
  searchLibrary(query: string): Promise<SearchResult<Source | Principle>[]>;
  semanticSearch(query: string): Promise<SearchResult<Source | Principle>[]>;
  createSocraticQuestions(sourceId: string): Promise<Question[]>;
  reduceToFirstPrinciples(text: string): Promise<string[]>;
  synthesiseKnowledge(entityIds: string[]): Promise<string>;
  generateAgoraScenario(context?: string): Promise<AgoraSession>;
  analyseForumResponse(session: ForumSession): Promise<Array<{ category: string; observation: string }>>;
  extractTranscript(transcript: string): Promise<{ interpretations: Interpretation[]; principles: Principle[]; connections: Connection[] }>;
  createKnowledgeRecord(input: unknown): Promise<Source | Interpretation | Principle | Connection>;
}
