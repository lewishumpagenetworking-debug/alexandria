import { listCaptures } from "@/lib/capture-store";
import { loadBooks } from "@/lib/application-store";
import {
  addAgoraSession,
  addForumSession,
  addInterrogation,
  addRecallCheck,
  listAgoraSessions,
  listForumSessions,
  listFirstPrinciplesWork,
  listInterrogations,
  listRecallChecks,
  recordObservation,
  recordRevision,
  saveFirstPrinciplesWork,
  type FirstPrinciplesStage,
  type RecallStage,
} from "@/lib/academy-store";
import { seedRecallPassages } from "@/data/mock-data";
import { awardPoints, awardStreakBonusIfDue, recordIfBest, POINTS, type PersonalBest, type PointEvent } from "@/lib/points-store";
import { getDueRetrievals, listCards, recordKnowledgeEngagement, recordRetrievalScoreByRef, registerCard, type RetrievalQuality } from "@/lib/retrieval-store";

export type LoopStage =
  | "encounter"
  | "recall"
  | "interrogate"
  | "reduce"
  | "rebuild"
  | "connect"
  | "articulate"
  | "apply"
  | "observe"
  | "revise"
  | "retrieve-again";

export type ExerciseType = "interrogation" | "first-principles" | "agora" | "forum" | "recall-check";

export const STAGE_ORDER: LoopStage[] = [
  "encounter", "recall", "interrogate", "reduce", "rebuild",
  "connect", "articulate", "apply", "observe", "revise", "retrieve-again",
];

export const STAGE_LABELS: Record<LoopStage, string> = {
  encounter: "Encounter", recall: "Recall", interrogate: "Interrogate", reduce: "Reduce", rebuild: "Rebuild",
  connect: "Connect", articulate: "Articulate", apply: "Apply", observe: "Observe", revise: "Revise",
  "retrieve-again": "Retrieve Again",
};

const STAGE_EXERCISE: Record<LoopStage, ExerciseType> = {
  encounter: "recall-check", recall: "recall-check", interrogate: "interrogation",
  reduce: "first-principles", rebuild: "first-principles", connect: "agora",
  articulate: "forum", apply: "agora", observe: "recall-check", revise: "recall-check",
  "retrieve-again": "recall-check",
};

const STEPS_PER_DAY = 2;
const PATHS_KEY = "alexandria-academy-path-v1";

export type SourceRefType = "capture" | "highlight" | "principle";

export interface SourceRef {
  type: SourceRefType;
  id: string;
  label: string;
  text: string;
}

export interface PathStep {
  id: string;
  day: number;
  date: string;
  order: number;
  stage: LoopStage;
  exerciseType: ExerciseType;
  sourceRef?: SourceRef;
  status: "locked" | "available" | "completed";
  completedAt?: string;
}

export type StepResult =
  | { exerciseType: "interrogation"; passageText: string; passageSource: string; responses: string[] }
  | { exerciseType: "first-principles"; values: Record<string, string> }
  | { exerciseType: "agora"; scenario: string; durationSeconds: number; response: string }
  | { exerciseType: "forum"; challenge: string; audience: string; format: string; response: string }
  | { exerciseType: "recall-check"; prompt: string; response: string; quality?: RetrievalQuality };

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function getAllSteps(): PathStep[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PATHS_KEY) || "[]") as PathStep[];
  } catch {
    return [];
  }
}

function saveAllSteps(steps: PathStep[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PATHS_KEY, JSON.stringify(steps));
}

function deterministicJitter(id: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1000) / 1000;
}

function pickEncounterSource(excludeIds: Set<string>, seedIndex: number): SourceRef {
  const cards = listCards()
    .filter((card) => !excludeIds.has(card.refId))
    .map((card) => {
      const last = card.lastEngagedAt ? new Date(card.lastEngagedAt).getTime() : 0;
      const daysSince = last ? Math.max(0, (Date.now() - last) / 86400000) : 999;
      const freshness = card.engagementCount ? Math.min(30, daysSince) : 60;
      const dueBonus = card.dueAt <= todayISO() ? 35 : 0;
      const noveltyBonus = (card.engagementCount ?? 0) === 0 ? 45 : 0;
      const repeatPenalty = Math.min(35, (card.engagementCount ?? 0) * 6);
      const score = freshness + dueBonus + noveltyBonus - repeatPenalty + deterministicJitter(card.id, seedIndex) * 18;
      return { card, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = cards[0]?.card;
  if (best) return { type: best.refType, id: best.refId, label: best.label, text: best.text };

  const captures = listCaptures().filter((item) => !excludeIds.has(item.id));
  if (captures.length) {
    const capture = captures[Math.floor(deterministicJitter(todayISO(), seedIndex) * captures.length) % captures.length];
    return { type: "capture", id: capture.id, label: capture.type, text: capture.text };
  }

  const candidates: SourceRef[] = [];
  for (const book of loadBooks()) {
    book.highlights.forEach((text, index) => {
      const id = `${book.id}-${index}`;
      if (!excludeIds.has(id)) candidates.push({ type: "highlight", id, label: book.title, text });
    });
  }
  if (candidates.length) {
    const index = Math.floor(deterministicJitter(todayISO(), seedIndex) * candidates.length) % candidates.length;
    return candidates[index];
  }

  const seed = seedRecallPassages[seedIndex % seedRecallPassages.length];
  return { type: "highlight", id: `seed-${seed.id}`, label: seed.source, text: seed.text };
}

function pickFirstPrinciplesSource(kind: "observe" | "revise"): SourceRef {
  const works = listFirstPrinciplesWork();
  const candidate =
    kind === "observe"
      ? works.find((work) => !work.observedOutcome)
      : works.find((work) => work.observedOutcome && !work.revisedStatement) ?? works.find((work) => !work.revisedStatement);

  if (candidate) {
    const text = candidate.values["Reconstruction"] || candidate.values["Application"] || Object.values(candidate.values)[0] || "";
    return { type: "principle", id: candidate.id, label: candidate.stage === "reduce" ? "First Principles · Reduce" : "First Principles · Rebuild", text };
  }

  return {
    type: "principle",
    id: "seed-principle",
    label: "Seed principle",
    text: "Preserve optionality until information becomes decision-relevant.",
  };
}

function pickDueSource(excludeIds: Set<string>, refTypes?: SourceRefType[]): SourceRef | undefined {
  const due = getDueRetrievals(20).find((card) => !excludeIds.has(card.refId) && (!refTypes || refTypes.includes(card.refType)));
  return due ? { type: due.refType, id: due.refId, label: due.label, text: due.text } : undefined;
}

/** Every sourceRef ever shown gets registered for spaced review, so nothing is learned once and forgotten. */
function registerAndReturn(ref: SourceRef): SourceRef {
  registerCard(ref.type, ref.id, ref.label, ref.text);
  return ref;
}

function resolveSourceRef(stage: LoopStage, builtSoFar: PathStep[], seedIndex: number): SourceRef | undefined {
  if (stage === "encounter") {
    const excludeIds = new Set(builtSoFar.filter((step) => step.sourceRef?.type !== "principle").map((step) => step.sourceRef!.id));
    return registerAndReturn(pickEncounterSource(excludeIds, seedIndex));
  }
  if (stage === "interrogate") {
    const excludeIds = new Set(builtSoFar.filter((step) => step.sourceRef).map((step) => step.sourceRef!.id));
    return registerAndReturn(pickEncounterSource(excludeIds, seedIndex + 17));
  }
  if (stage === "recall" || stage === "retrieve-again") {
    const excludeIds = new Set(builtSoFar.filter((step) => step.sourceRef).map((step) => step.sourceRef!.id));
    const due = pickDueSource(excludeIds);
    if (due) return due;
    const previous = [...builtSoFar].reverse().find((step) => step.sourceRef && (step.stage === "encounter" || step.stage === "retrieve-again"));
    return registerAndReturn(previous?.sourceRef ?? pickEncounterSource(new Set(), seedIndex));
  }
  if (stage === "observe" || stage === "revise") {
    const due = pickDueSource(new Set(), ["principle"]);
    if (due) return due;
    return registerAndReturn(pickFirstPrinciplesSource(stage));
  }
  if (stage === "rebuild") {
    const priorReduce = listFirstPrinciplesWork().find((work) => work.stage === "reduce");
    if (priorReduce) {
      const text = priorReduce.values["Fundamental truths"] || priorReduce.values["Reconstruction"] || Object.values(priorReduce.values)[0] || "";
      return registerAndReturn({ type: "principle", id: priorReduce.id, label: "First Principles · Reduce", text });
    }
    return registerAndReturn({ type: "principle", id: "seed-principle", label: "Seed principle", text: "Preserve optionality until information becomes decision-relevant." });
  }
  return undefined;
}

function generateNextBatch(all: PathStep[], date: string): PathStep[] {
  const startIndex = all.length % STAGE_ORDER.length;
  const day = new Set(all.map((step) => step.date)).size + 1;
  const batch: PathStep[] = [];

  for (let i = 0; i < STEPS_PER_DAY; i++) {
    const stage = STAGE_ORDER[(startIndex + i) % STAGE_ORDER.length];
    batch.push({
      id: `${date}-${i}`,
      day,
      date,
      order: i,
      stage,
      exerciseType: STAGE_EXERCISE[stage],
      sourceRef: resolveSourceRef(stage, [...all, ...batch], i),
      status: i === 0 ? "available" : "locked",
    });
  }
  return batch;
}

/**
 * Returns the path for `date`. If earlier steps are still incomplete, those are returned
 * instead (you cannot get ahead by letting a day lapse). If `date` already has a generated
 * batch — complete or not — that batch is returned as-is; a new batch is only generated the
 * first time a given date is asked for.
 */
export function getDailyPath(date: string = todayISO()): PathStep[] {
  const all = getAllSteps();
  const incomplete = all.filter((step) => step.status !== "completed");
  if (incomplete.length > 0) return incomplete;

  const existingForDate = all.filter((step) => step.date === date);
  if (existingForDate.length > 0) return existingForDate;

  const generated = generateNextBatch(all, date);
  saveAllSteps([...all, ...generated]);
  return generated;
}

export function getCurrentStep(): PathStep | null {
  const steps = getDailyPath(todayISO());
  return steps.find((step) => step.status !== "completed") ?? null;
}

export interface CompletionOutcome {
  pointsAwarded: PointEvent[];
  newBests: PersonalBest[];
}

const EXERCISE_POINTS: Record<ExerciseType, number> = {
  "recall-check": POINTS.recallCheck,
  interrogation: POINTS.interrogation,
  "first-principles": POINTS.firstPrinciples,
  agora: POINTS.agora,
  forum: POINTS.forum,
};

/**
 * Persists an exercise result (session record + points + personal bests) without any dependency
 * on a PathStep. Shared by the daily Path (completeStep) and any on-demand session, such as a
 * per-book study loop, so the points/bests logic never has to be duplicated.
 */
export function recordSessionResult(
  result: Exclude<StepResult, { exerciseType: "recall-check" }>,
  exerciseLabel: string,
  firstPrinciplesStage: FirstPrinciplesStage = "reduce"
): CompletionOutcome {
  const pointsAwarded: PointEvent[] = [];
  const newBests: PersonalBest[] = [];

  if (result.exerciseType === "interrogation") {
    addInterrogation({ passageText: result.passageText, passageSource: result.passageSource, responses: result.responses });
    const chars = result.responses.reduce((sum, response) => sum + response.length, 0);
    const best = recordIfBest("interrogation-depth", chars, "Longest Interrogation reconstruction");
    if (best.isNewBest) newBests.push(best.best);
  } else if (result.exerciseType === "first-principles") {
    const work = saveFirstPrinciplesWork({ stage: firstPrinciplesStage, values: result.values });
    const text = work.values["Reconstruction"] || work.values["Application"] || Object.values(work.values)[0] || "";
    registerCard("principle", work.id, `First Principles · ${firstPrinciplesStage === "reduce" ? "Reduce" : "Rebuild"}`, text);
    const chars = Object.values(result.values).reduce((sum, value) => sum + value.length, 0);
    const best = recordIfBest("first-principles-depth", chars, "Deepest First Principles pass");
    if (best.isNewBest) newBests.push(best.best);
  } else if (result.exerciseType === "agora") {
    addAgoraSession({ scenario: result.scenario, durationSeconds: result.durationSeconds, response: result.response });
    const best = recordIfBest("agora-response-length", result.response.length, "Longest Agora response");
    if (best.isNewBest) newBests.push(best.best);
  } else {
    addForumSession({ challenge: result.challenge, audience: result.audience, format: result.format, response: result.response });
    const best = recordIfBest("forum-response-length", result.response.length, "Longest Forum response");
    if (best.isNewBest) newBests.push(best.best);
  }

  pointsAwarded.push(awardPoints(result.exerciseType, `${exerciseLabel} completed`, EXERCISE_POINTS[result.exerciseType]));
  return { pointsAwarded, newBests };
}

export function completeStep(stepId: string, result: StepResult): CompletionOutcome {
  const all = getAllSteps();
  const step = all.find((item) => item.id === stepId);
  if (!step || step.status === "completed") return { pointsAwarded: [], newBests: [] };

  let outcome: CompletionOutcome;
  if (result.exerciseType === "recall-check") {
    addRecallCheck({ stage: step.stage as RecallStage, prompt: result.prompt, response: result.response });
    if (step.stage === "observe" && step.sourceRef?.type === "principle") recordObservation(step.sourceRef.id, result.response);
    if (step.sourceRef) recordKnowledgeEngagement(step.sourceRef.type, step.sourceRef.id);
    if (step.stage === "revise" && step.sourceRef?.type === "principle") recordRevision(step.sourceRef.id, result.response);
    if (result.quality && step.sourceRef) recordRetrievalScoreByRef(step.sourceRef.type, step.sourceRef.id, result.quality as RetrievalQuality);
    outcome = { pointsAwarded: [awardPoints("recall-check", `${STAGE_LABELS[step.stage]} step completed`, POINTS.recallCheck, step.id)], newBests: [] };
  } else {
    outcome = recordSessionResult(result, STAGE_LABELS[step.stage], step.stage as FirstPrinciplesStage);
    if (step.sourceRef) recordKnowledgeEngagement(step.sourceRef.type, step.sourceRef.id);
  }
  const pointsAwarded = outcome.pointsAwarded;
  const newBests = outcome.newBests;

  const completedAt = new Date().toISOString();
  const nextInDay = all.find((item) => item.date === step.date && item.order === step.order + 1);
  const updated = all.map((item) => {
    if (item.id === stepId) return { ...item, status: "completed" as const, completedAt };
    if (nextInDay && item.id === nextInDay.id) return { ...item, status: "available" as const };
    return item;
  });
  saveAllSteps(updated);

  const completedCount = updated.filter((item) => item.status === "completed").length;
  if (completedCount > 0 && completedCount % STAGE_ORDER.length === 0) {
    pointsAwarded.push(awardPoints("loop-lap", "Completed a full lap of the loop", POINTS.loopLap));
  }

  const stats = getStats();
  pointsAwarded.push(...awardStreakBonusIfDue(stats.currentStreakDays));

  return { pointsAwarded, newBests };
}

export interface AcademyStats {
  totalSteps: number;
  completedSteps: number;
  currentStreakDays: number;
  longestStreakDays: number;
  cycleLaps: number;
  sessionsByType: {
    interrogation: number;
    firstPrinciples: number;
    agora: number;
    forum: number;
    recallCheck: number;
  };
}

function computeStreaks(completedDates: string[]): { current: number; longest: number } {
  if (!completedDates.length) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const diffDays = Math.round((new Date(completedDates[i]).getTime() - new Date(completedDates[i - 1]).getTime()) / 86400000);
    run = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const diffFromToday = Math.round((new Date(todayISO()).getTime() - new Date(completedDates[completedDates.length - 1]).getTime()) / 86400000);
  return { current: diffFromToday <= 1 ? run : 0, longest };
}

export function getStats(): AcademyStats {
  const all = getAllSteps();
  const completed = all.filter((step) => step.status === "completed");
  const completedDates = Array.from(new Set(completed.map((step) => step.date))).sort();
  const { current, longest } = computeStreaks(completedDates);
  return {
    totalSteps: all.length,
    completedSteps: completed.length,
    currentStreakDays: current,
    longestStreakDays: longest,
    cycleLaps: Math.floor(completed.length / STAGE_ORDER.length),
    sessionsByType: {
      interrogation: listInterrogations().length,
      firstPrinciples: listFirstPrinciplesWork().length,
      agora: listAgoraSessions().length,
      forum: listForumSessions().length,
      recallCheck: listRecallChecks().length,
    },
  };
}


/** Swap the current knowledge item for another priority-ranked item without completing the step.
 * Used by "Save for later" so the draft remains available but the user can work on something else.
 */
export function rotateStepSource(stepId: string): PathStep | null {
  const all = getAllSteps();
  const step = all.find((item) => item.id === stepId);
  if (!step) return null;
  const exclude = new Set(all.filter((item) => item.sourceRef).map((item) => item.sourceRef!.id));
  if (step.sourceRef) exclude.add(step.sourceRef.id);
  const replacement = registerAndReturn(pickEncounterSource(exclude, all.length + step.order + Date.now() % 997));
  const updatedStep = { ...step, sourceRef: replacement };
  saveAllSteps(all.map((item) => item.id === stepId ? updatedStep : item));
  return updatedStep;
}


export function setStepSource(stepId: string, sourceRef: SourceRef): PathStep | null {
  const all = getAllSteps();
  const step = all.find((item) => item.id === stepId);
  if (!step) return null;
  const updatedStep = { ...step, sourceRef: registerAndReturn(sourceRef) };
  saveAllSteps(all.map((item) => item.id === stepId ? updatedStep : item));
  return updatedStep;
}
