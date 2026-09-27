export type AIProvider = "none" | "openai" | "anthropic";

export interface AppSettings {
  aiProvider: AIProvider;
  aiApiKey: string;
  aiModel: string;
  notificationsEnabled: boolean;
  reminderMorning: boolean;
  reminderAfternoon: boolean;
  reminderEvening: boolean;
  reminderMorningTime: string;
  reminderAfternoonTime: string;
  reminderEveningTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: "none",
  aiApiKey: "",
  aiModel: "",
  notificationsEnabled: false,
  reminderMorning: true,
  reminderAfternoon: true,
  reminderEvening: true,
  reminderMorningTime: "08:00",
  reminderAfternoonTime: "15:00",
  reminderEveningTime: "20:00",
  quietHoursStart: "22:30",
  quietHoursEnd: "07:00",
};
const KEY = "alexandria-settings-v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEY, {}) };
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isAIConfigured(): boolean {
  const settings = getSettings();
  return settings.aiProvider !== "none" && settings.aiApiKey.trim().length > 0;
}

/** Shows only the first and last 3 characters, e.g. "sk-•••••••abc". */
export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(key.length - 7)}${key.slice(-3)}`;
}
