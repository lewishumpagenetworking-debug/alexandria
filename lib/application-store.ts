export type StoredBook = {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  progressMode?: "pages" | "percentage";
  currentPercent?: number;
  voiceTotalMinutes?: number;
  voiceReferenceWpm?: number;
  voiceWpm?: number;
  completed: boolean;
  readingFinishedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  highlights: string[];
  principles: number;
  lastRead: string;
};

export type ReadingMethod = "reading" | "listening" | "reading-listening";

export type ReadingLog = {
  id: string;
  bookId: string;
  bookTitle: string;
  pages: number;
  minutes: number;
  date: string;
  method?: ReadingMethod;
  format?: "physical" | "kindle" | "pdf" | "audiobook";
  progressPercent?: number;
  fromPercent?: number;
  toPercent?: number;
  voiceWpm?: number;
  estimatedMinutes?: number;
  audioSpeed?: number;
  audioMinutes?: number;
  listeningContext?: string;
  comfortableSpeed?: number;
  trainingSpeed?: number;
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

export const loadBooks = (options: { includeArchived?: boolean; includeDeleted?: boolean } = {}) =>
  read<StoredBook[]>(BOOKS, seedBooks).filter(book => (options.includeDeleted || !book.deletedAt) && (options.includeArchived || !book.archivedAt));
export const saveBooks = (books: StoredBook[]) => {
  const previous = read<StoredBook[]>(BOOKS, seedBooks);
  const next = books.map(book => {
    const prior = previous.find(item => item.id === book.id);
    const finished = book.progressMode === "percentage" ? (book.currentPercent ?? 0) >= 100 : book.totalPages > 1 && book.currentPage >= book.totalPages;
    return { ...book, archivedAt: prior ? prior.archivedAt : book.archivedAt, deletedAt: prior ? prior.deletedAt : book.deletedAt, completed: finished, readingFinishedAt: book.readingFinishedAt ?? prior?.readingFinishedAt ?? (finished && prior && !prior.completed ? new Date().toISOString() : undefined) };
  });
  // Older views save their visible shelf. Keep hidden books and their source IDs intact.
  const hidden = previous.filter(book => (book.archivedAt || book.deletedAt) && !next.some(item => item.id === book.id));
  localStorage.setItem(BOOKS, JSON.stringify([...next, ...hidden]));
};
export const loadLogs = () => read<ReadingLog[]>(LOGS, []);
export const saveLogs = (logs: ReadingLog[]) => localStorage.setItem(LOGS, JSON.stringify(logs));

export function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

export function createBook(input: { title: string; author?: string; totalPages?: number; currentPage?: number }): StoredBook {
  const title = input.title.trim();
  const currentPage = input.currentPage ?? 0;
  const totalPages = input.totalPages ?? 1;
  if (!title) throw new Error("Enter a book title.");
  if (input.totalPages !== undefined && (!Number.isInteger(totalPages) || totalPages < 2)) throw new Error("Enter the actual total pages (at least 2).");
  if (!Number.isInteger(currentPage) || currentPage < 0 || currentPage >= totalPages) throw new Error("Starting page must be a whole number below the total pages.");
  const book: StoredBook = { id: uid("book"), title, author: input.author?.trim() || "Unknown author", totalPages, currentPage, completed: false, highlights: [], principles: 0, lastRead: "Not logged yet" };
  saveBooks([...loadBooks({ includeArchived: true, includeDeleted: true }), book]);
  window.dispatchEvent(new Event("alexandria:data"));
  return book;
}

export function updateBookDetails(id: string, input: { title: string; author: string; totalPages?: number }): void {
  const books = loadBooks({ includeArchived: true, includeDeleted: true });
  const book = books.find(item => item.id === id && !item.deletedAt);
  if (!book) throw new Error("This book is unavailable.");
  if (!input.title.trim()) throw new Error("Enter a book title.");
  const totalPages = input.totalPages ?? book.totalPages;
  if (input.totalPages !== undefined && (!Number.isInteger(input.totalPages) || input.totalPages < 2 || (input.totalPages < book.currentPage || (!book.completed && input.totalPages === book.currentPage)))) throw new Error("Total pages must be a whole number at least as large as the current page.");
  const plans = read<{ bookId: string; totalPages: number; unit?: "percentage"; pageTotal?: number }[]>("alexandria-reading-commitments-v1", []);
  const plan = plans.find(item => item.bookId === id);
  if (plan && (plan.unit !== "percentage" || plan.pageTotal) && totalPages !== (plan.pageTotal ?? plan.totalPages)) throw new Error("The total pages are fixed by this book's seven-day commitment.");
  saveBooks(books.map(item => item.id === id ? { ...item, title: input.title.trim(), author: input.author.trim() || "Unknown author", totalPages } : item));
  saveLogs(loadLogs().map(log => log.bookId === id ? { ...log, bookTitle: input.title.trim() } : log));
  window.dispatchEvent(new Event("alexandria:data"));
}

export function setBookState(id: string, action: "archive" | "unarchive" | "delete" | "restore"): void {
  const books = loadBooks({ includeArchived: true, includeDeleted: true });
  if (!books.some(book => book.id === id)) throw new Error("Book not found.");
  localStorage.setItem(BOOKS, JSON.stringify(books.map(book => book.id === id ? {
    ...book,
    archivedAt: action === "archive" ? new Date().toISOString() : action === "unarchive" ? undefined : book.archivedAt,
    deletedAt: action === "delete" ? new Date().toISOString() : action === "restore" ? undefined : book.deletedAt,
  } : book)));
  window.dispatchEvent(new Event("alexandria:data"));
}
