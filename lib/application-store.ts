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

export const seedBooks: StoredBook[] = [
  ["beginning", "The Beginning of Infinity", "David Deutsch", 218, 341, 7],
  ["feynman", "Surely You’re Joking, Mr. Feynman!", "Richard Feynman", 122, 350, 3],
  ["demon", "The Demon-Haunted World", "Carl Sagan", 64, 480, 4],
  ["thinking", "Thinking, Fast and Slow", "Daniel Kahneman", 499, 499, 11],
  ["superforecasting", "Superforecasting", "Philip Tetlock", 98, 352, 5],
  ["cosmos", "Cosmos", "Carl Sagan", 365, 365, 8],
  ["selfish-gene", "The Selfish Gene", "Richard Dawkins", 76, 384, 4],
  ["revolutions", "The Structure of Scientific Revolutions", "Thomas Kuhn", 44, 264, 2],
  ["brief-time", "A Brief History of Time", "Stephen Hawking", 112, 256, 3],
  ["fabric", "The Fabric of Reality", "David Deutsch", 38, 400, 1],
  ["geb", "Gödel, Escher, Bach", "Douglas Hofstadter", 83, 777, 4],
].map(([id, title, author, currentPage, totalPages, principles]) => ({
  id: String(id), title: String(title), author: String(author), currentPage: Number(currentPage), totalPages: Number(totalPages), principles: Number(principles),
  completed: Number(currentPage) >= Number(totalPages), highlights: [], lastRead: "17 Sep 2026",
}));

const BOOKS = "alexandria-books-v2";
const LOGS = "alexandria-reading-logs-v2";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export const loadBooks = () => read<StoredBook[]>(BOOKS, seedBooks);
export const saveBooks = (books: StoredBook[]) => localStorage.setItem(BOOKS, JSON.stringify(books));
export const loadLogs = () => read<ReadingLog[]>(LOGS, []);
export const saveLogs = (logs: ReadingLog[]) => localStorage.setItem(LOGS, JSON.stringify(logs));

export function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}
