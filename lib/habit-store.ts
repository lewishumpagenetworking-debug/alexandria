export interface HabitReplacement {
  id: string;
  bookId?: string;
  bookTitle?: string;
  targetMinutes: number;
  startedAt: string;
  completedAt?: string;
  abandonedAt?: string;
  actualMinutes?: number;
}

const KEY = "alexandria-habit-replacements-v1";
const ACTIVE_KEY = "alexandria-active-habit-replacement-v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("alexandria:data"));
}

export const listHabitReplacements = () => read<HabitReplacement[]>(KEY, []);
export const getActiveHabitReplacement = () => read<HabitReplacement | null>(ACTIVE_KEY, null);

export function startHabitReplacement(input: { bookId?: string; bookTitle?: string; targetMinutes: number }): HabitReplacement {
  const active: HabitReplacement = {
    id: `habit-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    targetMinutes: input.targetMinutes,
    startedAt: new Date().toISOString(),
  };
  write(ACTIVE_KEY, active);
  return active;
}

export function completeHabitReplacement(actualMinutes?: number): HabitReplacement | null {
  const active = getActiveHabitReplacement();
  if (!active) return null;
  const completed = { ...active, completedAt: new Date().toISOString(), actualMinutes: actualMinutes ?? active.targetMinutes };
  write(KEY, [completed, ...listHabitReplacements()].slice(0, 1000));
  localStorage.removeItem(ACTIVE_KEY);
  window.dispatchEvent(new Event("alexandria:data"));
  return completed;
}

export function abandonHabitReplacement(): HabitReplacement | null {
  const active = getActiveHabitReplacement();
  if (!active) return null;
  const abandoned = { ...active, abandonedAt: new Date().toISOString() };
  write(KEY, [abandoned, ...listHabitReplacements()].slice(0, 1000));
  localStorage.removeItem(ACTIVE_KEY);
  window.dispatchEvent(new Event("alexandria:data"));
  return abandoned;
}

export function getHabitStats() {
  const completed = listHabitReplacements().filter((item) => item.completedAt);
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  const completedToday = completed.filter((item) => item.completedAt?.startsWith(today));
  const minutes = completed.reduce((sum, item) => sum + (item.actualMinutes ?? item.targetMinutes), 0);
  const days = new Set(completed.map((item) => item.completedAt?.slice(0,10)).filter(Boolean));
  return {
    replacements: completed.length,
    replacementsToday: completedToday.length,
    minutes,
    readingChoiceDays: days.size,
  };
}
