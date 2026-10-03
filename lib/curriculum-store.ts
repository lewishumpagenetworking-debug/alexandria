import type { CurriculumFocusId } from "@/data/curriculum";

export type LearningCampaign = {
  focusId: CurriculumFocusId;
  capabilityBookId: string;
  leaderBookId: string;
  startedAt: string;
};

const KEY = "alexandria-learning-campaign-v1";

export function loadLearningCampaign(): LearningCampaign | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function saveLearningCampaign(campaign: LearningCampaign): void {
  localStorage.setItem(KEY, JSON.stringify(campaign));
  window.dispatchEvent(new Event("alexandria:data"));
}

export function clearLearningCampaign(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("alexandria:data"));
}
