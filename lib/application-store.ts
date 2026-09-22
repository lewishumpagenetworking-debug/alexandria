export type StoredBook = {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  completed: boolean;
  highlights: string[];
  principles: number;
  lastRead: string;
};

export type ReadingLog = {
  id: string;
  bookId: string;
  bookTitle: string;
  pages: number;
  minutes: number;
  date: string;
};

export const seedBooks: StoredBook[] = [];

const BOOKS = "alexandria-books-v3";
const LOGS = "alexandria-reading-logs-v3";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export const loadBooks = () => read<StoredBook[]>(BOOKS, seedBooks);
export const saveBooks = (books: StoredBook[]) => {
  localStorage.setItem(BOOKS, JSON.stringify(books));
  window.dispatchEvent(new Event("alexandria:data"));
};
export const loadLogs = () => read<ReadingLog[]>(LOGS, []);
export const saveLogs = (logs: ReadingLog[]) => {
  localStorage.setItem(LOGS, JSON.stringify(logs));
  window.dispatchEvent(new Event("alexandria:data"));
};

export function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}
