const KEY = "alexandria-applications-v1";

export interface KnowledgeApplication {
  id: string;
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
  const item: KnowledgeApplication = { ...input, id: uid(), createdAt: new Date().toISOString() };
  write([item, ...read()].slice(0, 1000));
  return item;
}

export function updateOutcome(id: string, outcome: string): void {
  write(read().map((a) => a.id === id ? { ...a, outcome } : a));
}
