export type EntityId = string;
export type ISODateString = string;

export type InputSource = "keyboard" | "dictation" | "import" | "mcp";
export type KnowledgeState =
  | "collected"
  | "understood"
  | "interrogated"
  | "reduced"
  | "rebuilt"
  | "applied"
  | "tested"
  | "integrated"
  | "revised";

export interface Source {
  id: EntityId;
  type: "book" | "article" | "conversation" | "experience" | "experiment" | "other";
  title: string;
  creator?: string;
  description?: string;
  hallIds: EntityId[];
  state: KnowledgeState;
  createdAt: ISODateString;
}

export interface Book extends Source {
  type: "book";
  author: string;
  currentPage?: number;
  totalPages?: number;
  currentChapter?: number;
  totalChapters?: number;
}

export interface Highlight {
  id: EntityId;
  sourceId: EntityId;
  text: string;
  location?: string;
  capturedAt: ISODateString;
}

export interface Interpretation {
  id: EntityId;
  highlightId?: EntityId;
  sourceId: EntityId;
  text: string;
  inputSource: InputSource;
  createdAt: ISODateString;
}

export interface Principle {
  id: EntityId;
  statement: string;
  explanation?: string;
  sourceIds: EntityId[];
  confidence: number;
  state: KnowledgeState;
  revisedAt?: ISODateString;
}

export interface Connection {
  id: EntityId;
  fromEntityId: EntityId;
  toEntityId: EntityId;
  relationship: string;
  rationale?: string;
  createdAt: ISODateString;
}

export interface Application {
  id: EntityId;
  principleId: EntityId;
  context: string;
  action: string;
  expectedOutcome?: string;
  observedOutcome?: string;
  createdAt: ISODateString;
}

export interface Feedback {
  id: EntityId;
  entityId: EntityId;
  category: string;
  observation: string;
  createdAt: ISODateString;
}

export interface Revision {
  id: EntityId;
  principleId: EntityId;
  previousStatement: string;
  revisedStatement: string;
  reason: string;
  createdAt: ISODateString;
}

export interface ReadingSession {
  id: EntityId;
  bookId: EntityId;
  startedAt: ISODateString;
  durationMinutes: number;
  pagesRead: number;
  notes?: string;
}

export interface Question {
  id: EntityId;
  prompt: string;
  stage: "statement" | "assumptions" | "fundamentals" | "reduction" | "reconstruction" | "boundaries" | "application";
  sourceId?: EntityId;
}

export interface InterrogationSession {
  id: EntityId;
  sourceId?: EntityId;
  questionIds: EntityId[];
  responses: Array<{ questionId: EntityId; answer: string; inputSource: InputSource }>;
  startedAt: ISODateString;
  completedAt?: ISODateString;
}

export interface AgoraSession {
  id: EntityId;
  scenario: string;
  constraintSeconds: number;
  response?: string;
  inputSource?: InputSource;
  createdAt: ISODateString;
}

export interface ForumSession {
  id: EntityId;
  exercise: string;
  audience: string;
  constraintSeconds: number;
  response?: string;
  feedbackIds: EntityId[];
  inputSource?: InputSource;
  createdAt: ISODateString;
}

export interface CapabilityEvidence {
  id: EntityId;
  capability: "knowledge" | "reason" | "communication" | "action";
  statement: string;
  provenance: string;
  strength: "demonstrated" | "developing";
  recordedAt: ISODateString;
}

export interface CaptureDraft {
  id: EntityId;
  type: "Thought" | "Question" | "Book highlight" | "Observation" | "Work problem" | "Decision" | "Application" | "Feedback" | "Changed belief" | "Connection" | "Experiment";
  text: string;
  source?: string;
  category?: string;
  relatedBook?: string;
  inputSource: InputSource;
  createdAt: ISODateString;
}
