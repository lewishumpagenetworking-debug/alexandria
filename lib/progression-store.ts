export type ActivityKind =
  | "capture"
  | "reading_session"
  | "highlight"
  | "review_cycle"
  | "interrogation"
  | "principle"
  | "application";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  points: number;
  label: string;
  sourceId?: string;
  createdAt: string;
};

const KEY = "alexandria-progression-v1";

export const pointValues: Record<ActivityKind, number> = {
  capture: 5,
  reading_session: 10,
  highlight: 8,
  review_cycle: 20,
  interrogation: 25,
  principle: 30,
  application: 40,
};

function readEvents(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as ActivityEvent[];
  } catch {
    return [];
  }
}

export function listActivity() {
  return readEvents();
}

export function recordActivity(kind: ActivityKind, label: string, sourceId?: string) {
  if (typeof window === "undefined") return null;
  const event: ActivityEvent = {
    id: globalThis.crypto?.randomUUID?.() ?? `activity-${Date.now()}`,
    kind,
    points: pointValues[kind],
    label,
    sourceId,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([event, ...readEvents()].slice(0, 1500)));
  window.dispatchEvent(new Event("alexandria:progression"));
  return event;
}

function dayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function streakFromDays(days: string[]) {
  if (!days.length) return 0;
  const unique = [...new Set(days)].sort().reverse();
  let cursor = new Date();
  const today = dayKey(cursor);
  if (unique[0] !== today) {
    cursor.setDate(cursor.getDate() - 1);
    if (unique[0] !== dayKey(cursor)) return 0;
  }
  let streak = 0;
  for (const day of unique) {
    if (day !== dayKey(cursor)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function longestStreak(days: string[]) {
  const unique = [...new Set(days)].sort();
  if (!unique.length) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const previous = new Date(`${unique[i - 1]}T12:00:00`);
    previous.setDate(previous.getDate() + 1);
    if (dayKey(previous) === unique[i]) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

export function progressionSummary() {
  const events = readEvents();
  const activeDays = events.map((event) => dayKey(event.createdAt));
  const totalPoints = events.reduce((sum, event) => sum + event.points, 0);
  const level = Math.floor(totalPoints / 250) + 1;
  return {
    totalPoints,
    level,
    activeDays: new Set(activeDays).size,
    currentStreak: streakFromDays(activeDays),
    longestStreak: longestStreak(activeDays),
    reviewCycles: events.filter((event) => event.kind === "review_cycle").length,
    interrogations: events.filter((event) => event.kind === "interrogation").length,
    applications: events.filter((event) => event.kind === "application").length,
    today: events.filter((event) => dayKey(event.createdAt) === dayKey(new Date())),
  };
}

export function hasActivityToday(kind: ActivityKind) {
  return progressionSummary().today.some((event) => event.kind === kind);
}
