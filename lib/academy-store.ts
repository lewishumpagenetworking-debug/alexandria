export type InterrogationRecord = {
  id: string;
  passageText: string;
  passageSource: string;
  responses: string[];
  createdAt: string;
};

export type FirstPrinciplesStage = "reduce" | "rebuild";

export type FirstPrinciplesWork = {
  id: string;
  stage: FirstPrinciplesStage;
  values: Record<string, string>;
  observedOutcome?: string;
  revisedStatement?: string;
  revisedAt?: string;
  createdAt: string;
};

export type AgoraRecord = {
  id: string;
  scenario: string;
  durationSeconds: number;
  response: string;
  createdAt: string;
};

export type ForumRecord = {
  id: string;
  challenge: string;
  audience: string;
  format: string;
  response: string;
  createdAt: string;
};

export type RecallStage = "encounter" | "recall" | "observe" | "revise" | "retrieve-again";

export type RecallCheckRecord = {
  id: string;
  stage: RecallStage;
  prompt: string;
  response: string;
  createdAt: string;
};

const KEYS = {
  interrogations: "alexandria-interrogations-v2",
  firstPrinciples: "alexandria-first-principles-v2",
  agora: "alexandria-agora-v2",
  forum: "alexandria-forum-v2",
  recallChecks: "alexandria-recall-checks-v1",
};

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

export const listInterrogations = () => read<InterrogationRecord[]>(KEYS.interrogations, []);

export function addInterrogation(record: Omit<InterrogationRecord, "id" | "createdAt">): InterrogationRecord {
  const full: InterrogationRecord = { ...record, id: uid("interrogation"), createdAt: new Date().toISOString() };
  write(KEYS.interrogations, [full, ...listInterrogations()].slice(0, 200));
  return full;
}

export const listFirstPrinciplesWork = () => read<FirstPrinciplesWork[]>(KEYS.firstPrinciples, []);

export function saveFirstPrinciplesWork(work: Omit<FirstPrinciplesWork, "id" | "createdAt">): FirstPrinciplesWork {
  const full: FirstPrinciplesWork = { ...work, id: uid("principles"), createdAt: new Date().toISOString() };
  write(KEYS.firstPrinciples, [full, ...listFirstPrinciplesWork()].slice(0, 200));
  return full;
}

export function recordObservation(id: string, observedOutcome: string) {
  write(KEYS.firstPrinciples, listFirstPrinciplesWork().map((work) => (work.id === id ? { ...work, observedOutcome } : work)));
}

export function recordRevision(id: string, revisedStatement: string) {
  write(
    KEYS.firstPrinciples,
    listFirstPrinciplesWork().map((work) => (work.id === id ? { ...work, revisedStatement, revisedAt: new Date().toISOString() } : work))
  );
}

export const listAgoraSessions = () => read<AgoraRecord[]>(KEYS.agora, []);

export function addAgoraSession(record: Omit<AgoraRecord, "id" | "createdAt">): AgoraRecord {
  const full: AgoraRecord = { ...record, id: uid("agora"), createdAt: new Date().toISOString() };
  write(KEYS.agora, [full, ...listAgoraSessions()].slice(0, 200));
  return full;
}

export const listForumSessions = () => read<ForumRecord[]>(KEYS.forum, []);

export function addForumSession(record: Omit<ForumRecord, "id" | "createdAt">): ForumRecord {
  const full: ForumRecord = { ...record, id: uid("forum"), createdAt: new Date().toISOString() };
  write(KEYS.forum, [full, ...listForumSessions()].slice(0, 200));
  return full;
}

export const listRecallChecks = () => read<RecallCheckRecord[]>(KEYS.recallChecks, []);

export function addRecallCheck(record: Omit<RecallCheckRecord, "id" | "createdAt">): RecallCheckRecord {
  const full: RecallCheckRecord = { ...record, id: uid("recall"), createdAt: new Date().toISOString() };
  write(KEYS.recallChecks, [full, ...listRecallChecks()].slice(0, 200));
  return full;
}
