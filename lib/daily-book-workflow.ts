import { loadBooks, loadLogs } from "./application-store";
import { listApplications, addApplication } from "./apply-store";
import { addHighlight, addPrinciple } from "./library-notes-store";
import { registerCard } from "./retrieval-store";
import { executionStatus, listCommitments, londonDay } from "./reading-execution";

export const DAILY_TASKS = ["Review outcomes", "Read", "Recall", "Extract principle", "Plan application", "Explain", "Correct"] as const;
export type DailyTask = typeof DAILY_TASKS[number];
export interface DailyBookWorkflow {
  id: string;
  bookId: string;
  day: string;
  step: number;
  drafts: Record<string, string>;
  committed: Record<string, string>;
  dueApplicationIds: string[];
  highlightId?: string;
  principleId?: string;
  applicationId?: string;
  finishedAt?: string;
  kind?: "reading" | "outcome-review";
}
const KEY = "alexandria-daily-book-workflows-v1";
export function listDailyWorkflows(): DailyBookWorkflow[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function getDailyWorkflow(bookId: string, day = londonDay()): DailyBookWorkflow {
  const saved = listDailyWorkflows().find(item => item.bookId === bookId && item.day === day);
  if (saved) return saved;
  const dueApplicationIds = listApplications().filter(a => a.sourceId === bookId && a.reviewDate && a.reviewDate <= day && !a.outcome).map(a => a.id);
  const book = loadBooks().find(b => b.id === bookId);
  const pages = loadLogs().filter(log => log.bookId === bookId && log.createdAt && londonDay(new Date(log.createdAt)) === day).reduce((sum, log) => sum + log.pages, 0);
  const kind = book?.completed && pages === 0 && dueApplicationIds.length ? "outcome-review" : "reading";
  return { id: `${bookId}:${day}`, bookId, day, kind, step: dueApplicationIds.length ? 0 : 1, drafts: {}, committed: dueApplicationIds.length ? {} : { "0": "not-due" }, dueApplicationIds };
}
function persist(workflow: DailyBookWorkflow): DailyBookWorkflow {
  const items = listDailyWorkflows();
  localStorage.setItem(KEY, JSON.stringify([...items.filter(item => item.id !== workflow.id), workflow]));
  window.dispatchEvent(new Event("alexandria:data"));
  return workflow;
}
export function ensureDailyWorkflow(bookId: string, day = londonDay()): DailyBookWorkflow {
  const existing = listDailyWorkflows().find(item => item.bookId === bookId && item.day === day);
  return existing ?? persist(getDailyWorkflow(bookId, day));
}
export function saveDailyDraft(bookId: string, day: string, key: string, value: string): DailyBookWorkflow {
  const workflow = getDailyWorkflow(bookId, day);
  if (workflow.committed[String(workflow.step)] || workflow.finishedAt) return workflow;
  const allowed: Record<number, string[]> = { 0: [], 1: [], 2: ["location", "recall"], 3: ["principle", "evidence", "boundaries"], 4: ["context", "action", "prediction", "reviewDate"], 5: ["audience", "purpose", "medium", "explanation"], 6: ["gaps", "sourceCheck", "rewrite"] };
  if (!allowed[workflow.step]?.includes(key)) throw new Error("This field belongs to a different task.");
  return persist({ ...workflow, drafts: { ...workflow.drafts, [key]: value } });
}
export function readingTaskStatus(bookId: string, day = londonDay()) {
  const book = loadBooks({ includeArchived: true, includeDeleted: true }).find(b => b.id === bookId);
  const plan = listCommitments().find(p => p.bookId === bookId);
  if (!book || !plan) return { ready: false, quota: book ? book.progressMode === "percentage" ? 14.29 : Math.ceil(book.totalPages / 7) : 0, pages: 0, reason: "Set up pages or percentage tracking and begin this book's seven-day commitment." };
  const status = executionStatus(plan, book, loadLogs(), day);
  const ready = status.pagesToday + 1e-7 >= status.quota || (status.finished && status.pagesToday > 0 && !!book.readingFinishedAt && londonDay(new Date(book.readingFinishedAt)) === day);
  return { ready, quota: status.quota, pages: status.pagesToday, reason: ready ? "Daily pace target met." : `${Number(Math.max(0, status.quota - status.pagesToday).toFixed(2))} ${plan.unit === "percentage" ? "percentage points" : "pages"} remain to the optional pace target for ${day}.` };
}
export function commitDailyTask(bookId: string, day: string): DailyBookWorkflow {
  let workflow = getDailyWorkflow(bookId, day);
  if (workflow.finishedAt || workflow.committed[String(workflow.step)]) return workflow;
  const book = loadBooks().find(item => item.id === bookId);
  if (!book) throw new Error("Restore the book before continuing its workflow.");
  const d = workflow.drafts;
  const requireFields = (...fields: string[]) => { if (fields.some(field => !d[field]?.trim())) throw new Error("Complete every required field before committing this task."); };
  switch (workflow.step) {
    case 0: {
      const pending = listApplications().filter(a => workflow.dueApplicationIds.includes(a.id) && !a.outcome && (!a.reviewDate || a.reviewDate <= day));
      if (pending.length) throw new Error("Review each due outcome, or explicitly choose a future review date.");
      break;
    }
    case 1:
      // Reading pace is advisory. The personal weekly completion target must never lock the workflow.
      break;
    case 2: requireFields("location", "recall"); break;
    case 3: {
      requireFields("principle", "evidence", "boundaries");
      const highlight = addHighlight({ sourceId: book.id, location: d.location.trim(), text: d.evidence.trim() });
      const principle = addPrinciple({ highlightId: highlight.id, statement: d.principle.trim(), explanation: `Source: ${d.location.trim()}\nSupporting evidence: ${d.evidence.trim()}\nConditions and exceptions: ${d.boundaries.trim()}`, sourceIds: [book.id], confidence: 0, state: "collected" });
      registerCard("highlight", highlight.id, book.title, highlight.text);
      workflow = { ...workflow, highlightId: highlight.id, principleId: principle.id };
      break;
    }
    case 4: {
      requireFields("context", "action", "prediction", "reviewDate");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.reviewDate) || d.reviewDate <= day) throw new Error("Choose an outcome review date after this session's date.");
      const application = addApplication({ sourceId: book.id, sourceTitle: book.title, sourceLocation: d.location, principleId: workflow.principleId, principleText: d.principle, context: d.context.trim(), action: d.action.trim(), expectedOutcome: d.prediction.trim(), reviewDate: d.reviewDate, status: "planned" });
      workflow = { ...workflow, applicationId: application.id };
      break;
    }
    case 5: requireFields("audience", "purpose", "medium", "explanation"); break;
    case 6: requireFields("gaps", "sourceCheck", "rewrite"); break;
    default: throw new Error("Unknown daily task.");
  }
  return persist({ ...workflow, committed: { ...workflow.committed, [String(workflow.step)]: new Date().toISOString() } });
}
export function advanceDailyTask(bookId: string, day: string): DailyBookWorkflow {
  const workflow = getDailyWorkflow(bookId, day);
  if (workflow.finishedAt) return workflow;
  if (!workflow.committed[String(workflow.step)]) throw new Error("Commit the current task before moving on.");
  if ((workflow.step === 0 && workflow.kind === "outcome-review") || workflow.step === DAILY_TASKS.length - 1) return persist({ ...workflow, finishedAt: new Date().toISOString() });
  return persist({ ...workflow, step: workflow.step + 1 });
}
