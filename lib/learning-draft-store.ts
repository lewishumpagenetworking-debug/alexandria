import type { SourceRef, ExerciseType } from "@/lib/path-store";

export interface LearningDraft {
  id: string;
  stepId: string;
  exerciseType: ExerciseType;
  sourceRef?: SourceRef;
  state: Record<string, unknown>;
  savedAt: string;
  deferred: boolean;
}

const KEY = "alexandria-learning-drafts-v1";

function read(): LearningDraft[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as LearningDraft[];
  } catch {
    return [];
  }
}

function write(items: LearningDraft[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("alexandria:drafts"));
}

function draftId(stepId: string, sourceRef?: SourceRef) {
  return `${stepId}::${sourceRef?.type ?? "none"}::${sourceRef?.id ?? "none"}`;
}

export function getLearningDraft(stepId: string, sourceRef?: SourceRef): LearningDraft | undefined {
  const id = draftId(stepId, sourceRef);
  return read().find((draft) => draft.id === id);
}

export function saveLearningDraft(input: {
  stepId: string;
  exerciseType: ExerciseType;
  sourceRef?: SourceRef;
  state: Record<string, unknown>;
  deferred?: boolean;
}): LearningDraft {
  const id = draftId(input.stepId, input.sourceRef);
  const draft: LearningDraft = {
    id,
    stepId: input.stepId,
    exerciseType: input.exerciseType,
    sourceRef: input.sourceRef,
    state: input.state,
    savedAt: new Date().toISOString(),
    deferred: input.deferred ?? false,
  };
  write([draft, ...read().filter((item) => item.id !== id)].slice(0, 300));
  return draft;
}

export function removeLearningDraft(stepId: string, sourceRef?: SourceRef) {
  const id = draftId(stepId, sourceRef);
  write(read().filter((draft) => draft.id !== id));
}

export function listLearningDrafts(): LearningDraft[] {
  return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
