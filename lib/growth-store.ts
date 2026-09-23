import { loadLogs } from "@/lib/application-store";
import { getStats } from "@/lib/path-store";
import { getPointsToday, getTotalPoints } from "@/lib/points-store";
import { getDueCount } from "@/lib/retrieval-store";
import { getSettings } from "@/lib/settings-store";

export interface Reminder {
  id: string;
  tone: "info" | "warn" | "good";
  text: string;
}

export interface GrowthSummary {
  streakDays: number;
  pointsToday: number;
  totalPoints: number;
  dueRetrievals: number;
  daysSinceLastSession: number | null;
  reminders: Reminder[];
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function getGrowthSummary(): GrowthSummary {
  const stats = getStats();
  const pointsToday = getPointsToday();
  const totalPoints = getTotalPoints();
  const dueRetrievals = getDueCount();
  const lastSessionAt = loadLogs().find((log) => log.createdAt)?.createdAt;
  const daysSinceLastSession = lastSessionAt ? daysSince(lastSessionAt) : null;

  const reminders: Reminder[] = [];
  if (dueRetrievals > 0) reminders.push({ id: "due", tone: "info", text: `${dueRetrievals} item${dueRetrievals === 1 ? "" : "s"} due for review in the Academy.` });
  if (daysSinceLastSession !== null && daysSinceLastSession >= 3) reminders.push({ id: "stale-reading", tone: "warn", text: `No reading session logged in ${daysSinceLastSession} days.` });
  if (stats.currentStreakDays === 0 && totalPoints > 0) reminders.push({ id: "streak-reset", tone: "warn", text: "Your streak reset — complete today's Path step to start a new one." });
  if (stats.currentStreakDays >= 7) reminders.push({ id: "streak-good", tone: "good", text: `${stats.currentStreakDays}-day streak — keep it going.` });
  if (pointsToday === 0 && stats.currentStreakDays > 0) reminders.push({ id: "not-yet-today", tone: "info", text: "Nothing logged yet today — the Path is waiting." });

  return { streakDays: stats.currentStreakDays, pointsToday, totalPoints, dueRetrievals, daysSinceLastSession, reminders };
}

const NOTIFIED_KEY = "alexandria-last-notified-date-v1";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

/** Fires at most one best-effort local notification per calendar day, only if the user opted in and a browser permission was granted. */
export function maybeNotify(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getSettings().notificationsEnabled) return;

  const today = todayISO();
  if (localStorage.getItem(NOTIFIED_KEY) === today) return;

  const summary = getGrowthSummary();
  const top = summary.reminders[0];
  if (!top) return;

  localStorage.setItem(NOTIFIED_KEY, today);
  new Notification("Alexandria", { body: top.text, tag: "alexandria-reminder" });
}
