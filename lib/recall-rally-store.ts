export interface RecallRallyRun {
  id: string;
  sourceTitle: string;
  startedAt: string;
  endedAt: string;
  levelReached: number;
  levelsWon: number;
  playerPoints: number;
  cpuPoints: number;
  questions: number;
  nailed: number;
  partial: number;
  missed: number;
  bestCombo: number;
  xpEarned: number;
  conceptsTested: string[];
  conceptsMissed: string[];
}

const KEY = "alexandria-recall-rally-runs-v2";

function read(): RecallRallyRun[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as RecallRallyRun[]; } catch { return []; }
}

function write(runs: RecallRallyRun[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(runs.slice(0, 100)));
  window.dispatchEvent(new Event("alexandria:data"));
}

export function saveRecallRallyRun(run: Omit<RecallRallyRun, "id">): RecallRallyRun {
  const saved = { ...run, id: `rally-${globalThis.crypto?.randomUUID?.() ?? Date.now()}` };
  write([saved, ...read()]);
  return saved;
}

export function listRecallRallyRuns(): RecallRallyRun[] {
  return read();
}

export function getRecallRallyBest() {
  const runs = read();
  const level = runs.reduce((best, run) => Math.max(best, run.levelReached), 0);
  const combo = runs.reduce((best, run) => Math.max(best, run.bestCombo), 0);
  const accuracy = runs.length
    ? Math.round(runs.reduce((sum, run) => sum + (run.questions ? (run.nailed / run.questions) * 100 : 0), 0) / runs.length)
    : 0;
  return { level, combo, accuracy, runs: runs.length };
}
