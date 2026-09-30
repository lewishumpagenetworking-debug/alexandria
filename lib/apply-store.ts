const KEY = "alexandria-applications-v1";

export interface KnowledgeApplication {
  id: string;
  sourceId?: string;
  sourceTitle?: string;
  reviewDate?: string;
  sourceLocation?: string;
  expectedOutcome?: string;
  status?: "planned" | "attempted" | "reviewed";
  attemptedAt?: string;
  principleText: string;
  principleId?: string;
  context: string;
  action: string;
  outcome?: string;
  createdAt: string;
}

function read(): KnowledgeApplication[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as KnowledgeApplication[]; } catch { return []; }
}

function write(items: KnowledgeApplication[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

function uid() { return `app-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`; }

export const listApplications = () => read();
export const getApplicationsForPrinciple = (principleId: string) => read().filter((a) => a.principleId === principleId);

export function addApplication(input: Omit<KnowledgeApplication, "id" | "createdAt">): KnowledgeApplication {
  const item: KnowledgeApplication = { ...input, status: input.status ?? (input.outcome ? "reviewed" : "attempted"), id: uid(), createdAt: new Date().toISOString() };
  write([item, ...read()].slice(0, 1000));
  return item;
}

export function updateOutcome(id: string, outcome: string): void {
  if (!outcome.trim()) throw new Error("Record the evidence from your application.");
  if (read().find(a => a.id === id)?.status === "planned") throw new Error("Mark the action attempted before recording its outcome.");
  write(read().map((a) => a.id === id ? { ...a, outcome: outcome.trim(), status: "reviewed" } : a));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("alexandria:data"));
}
export function markApplicationAttempted(id: string): void {
  write(read().map(a => a.id === id && a.status === "planned" ? { ...a, status: "attempted", attemptedAt: new Date().toISOString() } : a));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("alexandria:data"));
}
export function rescheduleApplication(id: string, reviewDate: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) throw new Error("Choose a valid review date.");
  write(read().map(a => a.id === id ? { ...a, reviewDate } : a));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("alexandria:data"));
}
