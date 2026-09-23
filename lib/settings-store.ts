export type AIProvider = "none" | "openai" | "anthropic";

export interface AppSettings {
  aiProvider: AIProvider;
  aiApiKey: string;
  aiModel: string;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = { aiProvider: "none", aiApiKey: "", aiModel: "", notificationsEnabled: false };
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
