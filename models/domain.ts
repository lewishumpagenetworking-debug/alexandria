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
  /** Alexandria's reasoned diagnosis of the source passage. */
  text: string;
  /** Optional named scholarly basis. This is supporting context, not an assertion that the scholar glossed the exact quote. */
  scholarName?: string;
  scholarBasis?: string;
  scholarSourceTitle?: string;
  scholarSourceUrl?: string;
  scholarConfidence?: "direct" | "contextual" | "none";
  inputSource: InputSource;
  createdAt: ISODateString;
}

export interface Principle {
  id: EntityId;
  /** Exact highlight that produced this principle when known. Older data may omit it. */
  highlightId?: EntityId;
  statement: string;
  explanation?: string;
  sourceIds: EntityId[];
  /** Which Halls of Knowledge this principle belongs to — a principle can cross disciplines. */
  hallIds?: EntityId[];
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


export type KnowledgeUnitState =
  | "captured"
  | "diagnosed"
  | "retrieving"
  | "understood"
  | "applied"
  | "integrated";

export interface KnowledgeUnitMastery {
  state: KnowledgeUnitState;
  strength: number;
  reviewCount: number;
  successCount: number;
  partialCount: number;
  missCount: number;
  nextReviewAt?: ISODateString;
  lastReviewedAt?: ISODateString;
  intervalDays: number;
  easeFactor: number;
}

export interface KnowledgeAttempt {
  id: EntityId;
  challengeType: "diagnosis" | "retrieval" | "principle" | "boundary" | "application";
  response: string;
  quality: "blank" | "partial" | "nailed";
  createdAt: ISODateString;
  surface?: "review" | "daily-challenge" | "pong" | "path" | "other";
}

export interface KnowledgeUnit {
  id: EntityId;
  sourceId: EntityId;
  sourceTitle: string;
  sourceCreator?: string;
  location?: string;
  quote: string;
  highlightId?: EntityId;
  interpretationId?: EntityId;
  principleId?: EntityId;
  alexandriaDiagnosis?: string;
  scholarName?: string;
  scholarBasis?: string;
  scholarSourceTitle?: string;
  scholarSourceUrl?: string;
  scholarConfidence?: "direct" | "contextual" | "none";
  principle?: string;
  principleExplanation?: string;
  assumptions: string[];
  fundamentals: string[];
  boundaries: string[];
  counterarguments: string[];
  ifTrigger?: string;
  thenAction?: string;
  rationale?: string;
  situationTags: string[];
  diagnosisHistory: KnowledgeAttempt[];
  mastery: KnowledgeUnitMastery;
  priority: number;
  lastSurfacedAt?: ISODateString;
  timesSurfaced: number;
  createdAt: ISODateString;
}
