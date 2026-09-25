import { listCards } from "@/lib/retrieval-store";
import { getTotalPoints } from "@/lib/points-store";

export interface ArcadeUnlock {
  id: "daily" | "rally" | "sprint" | "tower";
  name: string;
  unlocked: boolean;
  requirement: string;
  current: number;
  target: number;
}

export interface ArcadeAchievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export function getArcadeProgress() {
  const knowledgeItems = listCards().length;
  const xp = getTotalPoints();

  const unlocks: ArcadeUnlock[] = [
    { id: "daily", name: "Daily Challenge", unlocked: knowledgeItems >= 1, requirement: "Add 1 reviewable knowledge item", current: knowledgeItems, target: 1 },
    { id: "rally", name: "Recall Rally", unlocked: knowledgeItems >= 10, requirement: "Build a deck of 10 knowledge items", current: knowledgeItems, target: 10 },
    { id: "sprint", name: "Sprint Mode", unlocked: knowledgeItems >= 25, requirement: "Build a deck of 25 knowledge items", current: knowledgeItems, target: 25 },
    { id: "tower", name: "The Tower", unlocked: knowledgeItems >= 50 && xp >= 250, requirement: "50 knowledge items + 250 Knowledge XP", current: Math.min(knowledgeItems, 50), target: 50 },
  ];

  const achievements: ArcadeAchievement[] = [
    { id: "first-card", name: "First Fragment", description: "Add your first reviewable knowledge item.", unlocked: knowledgeItems >= 1 },
    { id: "deck-10", name: "Recall Deck", description: "Build a 10-item knowledge deck.", unlocked: knowledgeItems >= 10 },
    { id: "deck-25", name: "Working Memory", description: "Build a 25-item knowledge deck.", unlocked: knowledgeItems >= 25 },
    { id: "deck-50", name: "Archive Awakened", description: "Build a 50-item knowledge deck.", unlocked: knowledgeItems >= 50 },
    { id: "xp-250", name: "Scholar I", description: "Earn 250 Knowledge XP.", unlocked: xp >= 250 },
    { id: "xp-1000", name: "Scholar II", description: "Earn 1,000 Knowledge XP.", unlocked: xp >= 1000 },
  ];

  return { knowledgeItems, xp, unlocks, achievements };
}
