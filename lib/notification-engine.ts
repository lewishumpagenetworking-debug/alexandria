import { loadLogs } from "@/lib/application-store";
import { getActiveHabitReplacement } from "@/lib/habit-store";
import { getDueCount } from "@/lib/retrieval-store";
import { getSettings } from "@/lib/settings-store";

export type ReminderSlot = "morning" | "afternoon" | "evening";

export interface NotificationDiagnostics {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  enabled: boolean;
  lastSentAt?: string;
  lastSlot?: ReminderSlot | "test";
  lastOpenedAt?: string;
}

const SENT_KEY = "alexandria-notification-slots-v2";
const STATUS_KEY = "alexandria-notification-status-v2";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isInQuietHours(start: string, end: string): boolean {
  const now = nowMinutes();
  const from = minutesOf(start);
  const to = minutesOf(end);
  if (from === to) return false;
  return from < to ? now >= from && now < to : now >= from || now < to;
}

function hasReadToday() {
  const today = todayISO();
  return loadLogs().some((log) => log.createdAt?.startsWith(today));
}

function getSentMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SENT_KEY) || "{}"); } catch { return {}; }
}

function setSent(slot: ReminderSlot) {
  if (typeof window === "undefined") return;
  const map = getSentMap();
  localStorage.setItem(SENT_KEY, JSON.stringify({ ...map, [`${todayISO()}:${slot}`]: true }));
}

function wasSent(slot: ReminderSlot) {
  return Boolean(getSentMap()[`${todayISO()}:${slot}`]);
}

function writeStatus(patch: Partial<NotificationDiagnostics>) {
  if (typeof window === "undefined") return;
  let current: Partial<NotificationDiagnostics> = {};
  try { current = JSON.parse(localStorage.getItem(STATUS_KEY) || "{}"); } catch {}
  localStorage.setItem(STATUS_KEY, JSON.stringify({ ...current, ...patch }));
  window.dispatchEvent(new Event("alexandria:notification-status"));
}

export function getNotificationDiagnostics(): NotificationDiagnostics {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const settings = getSettings();
  let saved: Partial<NotificationDiagnostics> = {};
  if (typeof window !== "undefined") {
    try { saved = JSON.parse(localStorage.getItem(STATUS_KEY) || "{}"); } catch {}
  }
  return {
    supported,
    permission: supported ? Notification.permission : "unsupported",
    enabled: settings.notificationsEnabled,
    ...saved,
  };
}

function bodyFor(slot: ReminderSlot): string {
  const due = getDueCount();
  const active = getActiveHabitReplacement();
  const readToday = hasReadToday();

  if (active) return `Your ${active.targetMinutes}-minute reading replacement is still open. Finish the sprint before returning to the feed.`;

  if (slot === "morning") {
    if (!readToday) return due > 0
      ? `Start with reading, not scrolling: a short reading block plus ${due} review item${due === 1 ? "" : "s"} are waiting.`
      : "Start with reading, not scrolling. Ten focused minutes is enough to establish today's identity.";
    return due > 0 ? `${due} review item${due === 1 ? "" : "s"} are due. Strengthen them while they are still retrievable.` : "You've already read today. Protect the momentum.";
  }

  if (slot === "afternoon") {
    if (!readToday) return "No reading session is recorded yet today. Trade one scrolling break for a 10-minute reading sprint.";
    return due > 0 ? `Reading is logged. Now strengthen ${due} due concept${due === 1 ? "" : "s"} before the day gets away from you.` : "Reading is already in the bank today. A short second block compounds the habit.";
  }

  if (!readToday) return "The day is nearly over and no reading is recorded. A short session now still counts.";
  if (due > 0) return `Close the day by retrieving ${Math.min(due, 5)} concept${due === 1 ? "" : "s"}. Reading plus retrieval makes the knowledge stick.`;
  return "Reading and reviews are current. Close the day knowing you chose the long game.";
}

export function sendAlexandriaNotification(body: string, slot: ReminderSlot | "test" = "test"): boolean {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
  const notification = new Notification("Alexandria", {
    body,
    tag: slot === "test" ? "alexandria-test" : `alexandria-${slot}-${todayISO()}`,
  });
  writeStatus({ lastSentAt: new Date().toISOString(), lastSlot: slot });
  notification.onclick = () => {
    writeStatus({ lastOpenedAt: new Date().toISOString() });
    window.focus();
    notification.close();
  };
  return true;
}

export function checkScheduledNotifications(): void {
  if (typeof window === "undefined") return;
  const settings = getSettings();
  if (!settings.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
  if (isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) return;

  const current = nowMinutes();
  const slots: Array<{ slot: ReminderSlot; enabled: boolean; time: string; latest: number }> = [
    { slot: "morning", enabled: settings.reminderMorning, time: settings.reminderMorningTime, latest: minutesOf(settings.reminderAfternoonTime) },
    { slot: "afternoon", enabled: settings.reminderAfternoon, time: settings.reminderAfternoonTime, latest: minutesOf(settings.reminderEveningTime) },
    { slot: "evening", enabled: settings.reminderEvening, time: settings.reminderEveningTime, latest: minutesOf(settings.quietHoursStart) },
  ];

  for (const candidate of slots) {
    if (!candidate.enabled || wasSent(candidate.slot)) continue;
    const scheduled = minutesOf(candidate.time);
    const latest = candidate.latest > scheduled ? candidate.latest : 24 * 60;
    if (current >= scheduled && current < latest) {
      if (sendAlexandriaNotification(bodyFor(candidate.slot), candidate.slot)) setSent(candidate.slot);
      return;
    }
  }
}

export function startNotificationScheduler(): () => void {
  if (typeof window === "undefined") return () => {};
  checkScheduledNotifications();
  const timer = window.setInterval(checkScheduledNotifications, 60000);
  const visibility = () => { if (document.visibilityState === "visible") checkScheduledNotifications(); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("focus", checkScheduledNotifications);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("focus", checkScheduledNotifications);
  };
}
