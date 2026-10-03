import type { CaptureDraft } from "@/models/domain";

const STORAGE_KEY = "alexandria-captures";

export function listCaptures(): CaptureDraft[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CaptureDraft[];
  } catch {
    return [];
  }
}

export function saveCapture(draft: Omit<CaptureDraft, "id" | "createdAt">): CaptureDraft {
  const capture: CaptureDraft = {
    ...draft,
    id: globalThis.crypto?.randomUUID?.() ?? `capture-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([capture, ...listCaptures()].slice(0, 50)));
  return capture;
}


/** Removes imported question captures assigned to a book. Manual captures are preserved. */
export function removeImportedCapturesForBook(bookTitle: string): number {
  const captures = listCaptures();
  const next = captures.filter((item) => !(item.inputSource === "import" && item.relatedBook === bookTitle));
  const removed = captures.length - next.length;
  if (removed > 0) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return removed;
}
