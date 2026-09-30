export type StoredBook = {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  completed: boolean;
  readingFinishedAt?: string;
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
  /** ISO timestamp, added alongside the display-formatted `date` so staleness can be computed reliably. */
  createdAt?: string;
};

export const seedBooks: StoredBook[] = [];

const BOOKS = "alexandria-books-v2";
const LOGS = "alexandria-reading-logs-v2";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export const loadBooks = () => read<StoredBook[]>(BOOKS, seedBooks);
export const saveBooks = (books: StoredBook[]) => {
  const previous = loadBooks();
  const next = books.map(book => {
    const prior = previous.find(item => item.id === book.id);
    const finished = book.totalPages > 1 && book.currentPage >= book.totalPages;
    return { ...book, completed: finished, readingFinishedAt: book.readingFinishedAt ?? (finished && prior && prior.currentPage < prior.totalPages ? new Date().toISOString() : undefined) };
  });
  localStorage.setItem(BOOKS, JSON.stringify(next));
};
export const loadLogs = () => read<ReadingLog[]>(LOGS, []);
export const saveLogs = (logs: ReadingLog[]) => localStorage.setItem(LOGS, JSON.stringify(logs));

export function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}
