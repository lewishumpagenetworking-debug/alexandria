export type PointCategory =
  | "recall-check" | "interrogation" | "first-principles" | "agora" | "forum"
  | "reading-session" | "highlight" | "capture" | "book-import" | "loop-lap" | "streak";

export interface PointEvent {
  id: string;
  category: PointCategory;
  label: string;
  points: number;
  refId?: string;
  createdAt: string;
}

export interface PersonalBest {
  metric: string;
  value: number;
  label: string;
  achievedAt: string;
}

export const POINTS = {
  recallCheck: 8,
  interrogation: 15,
  firstPrinciples: 20,
  agora: 15,
  forum: 15,
  readingSession: 5,
  highlight: 3,
  capture: 2,
  bookImportPerRow: 2,
  loopLap: 50,
  streakDay: 5,
  streakMilestone7: 25,
  streakMilestone30: 100,
} as const;

const EVENTS_KEY = "alexandria-points-v1";
const BESTS_KEY = "alexandria-personal-bests-v1";
const MILESTONES_KEY = "alexandria-streak-milestones-v1";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

export const listPointEvents = () => read<PointEvent[]>(EVENTS_KEY, []);

export function awardPoints(category: PointCategory, label: string, points: number, refId?: string): PointEvent {
  const event: PointEvent = { id: uid("pt"), category, label, points, refId, createdAt: new Date().toISOString() };
  write(EVENTS_KEY, [event, ...listPointEvents()].slice(0, 2000));
  return event;
}

export function getTotalPoints(): number {
  return listPointEvents().reduce((sum, event) => sum + event.points, 0);
}

export function getPointsToday(): number {
  const today = todayISO();
  return listPointEvents()
    .filter((event) => event.createdAt.slice(0, 10) === today)
    .reduce((sum, event) => sum + event.points, 0);
}

export function getPointsHistory(days = 14): Array<{ date: string; points: number }> {
  const events = listPointEvents();
  const out: Array<{ date: string; points: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Intl.DateTimeFormat("en-CA").format(new Date(Date.now() - i * 86400000));
    out.push({ date, points: events.filter((event) => event.createdAt.slice(0, 10) === date).reduce((sum, event) => sum + event.points, 0) });
  }
  return out;
}

export const getPersonalBests = () => read<PersonalBest[]>(BESTS_KEY, []);

/** Records a new personal best if `value` beats the current one for `metric`. */
export function recordIfBest(metric: string, value: number, label: string): { isNewBest: boolean; best: PersonalBest } {
  const bests = getPersonalBests();
  const existing = bests.find((best) => best.metric === metric);
  if (!existing || value > existing.value) {
    const best: PersonalBest = { metric, value, label, achievedAt: new Date().toISOString() };
    write(BESTS_KEY, [...bests.filter((b) => b.metric !== metric), best]);
    return { isNewBest: true, best };
  }
  return { isNewBest: false, best: existing };
}

/** Awards the once-per-day streak bonus and any streak-length milestone bonus, at most once each. */
export function awardStreakBonusIfDue(currentStreakDays: number): PointEvent[] {
  const today = todayISO();
  const awardedDates = read<string[]>("alexandria-streak-awarded-dates-v1", []);
  const awarded: PointEvent[] = [];
  if (!awardedDates.includes(today)) {
    write("alexandria-streak-awarded-dates-v1", [...awardedDates, today].slice(-400));
    awarded.push(awardPoints("streak", `Day ${currentStreakDays} of your streak`, POINTS.streakDay));

    const milestones = read<Record<string, boolean>>(MILESTONES_KEY, {});
    if (currentStreakDays === 7 && !milestones["7"]) {
      write(MILESTONES_KEY, { ...milestones, "7": true });
      awarded.push(awardPoints("streak", "7-day streak milestone", POINTS.streakMilestone7));
    } else if (currentStreakDays === 30 && !milestones["30"]) {
      write(MILESTONES_KEY, { ...milestones, "30": true });
      awarded.push(awardPoints("streak", "30-day streak milestone", POINTS.streakMilestone30));
    }
  }
  return awarded;
}
