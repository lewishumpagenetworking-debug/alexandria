import type { ReadingLog, StoredBook } from "./application-store";

export interface ReadingCommitment {
  bookId: string;
  startDate: string;
  totalPages: number;
}
const KEY = "alexandria-reading-commitments-v1";
export function londonDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(date);
}
export function shiftDay(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
}
export function listCommitments(): ReadingCommitment[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function startCommitment(bookId: string, totalPages: number): void {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error("Enter the book's actual total page count.");
  const plans = listCommitments();
  if (plans.some(plan => plan.bookId === bookId)) throw new Error("This book already has a fixed reading commitment.");
  localStorage.setItem(KEY, JSON.stringify([...plans, { bookId, totalPages, startDate: londonDay() }]));
  window.dispatchEvent(new Event("alexandria:data"));
}
export function executionStatus(plan: ReadingCommitment, book: StoredBook, logs: ReadingLog[], today = londonDay()) {
  const elapsed = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${plan.startDate}T12:00:00Z`)) / 86400000);
  const day = Math.max(1, Math.min(7, elapsed + 1));
  const pageTarget = Math.ceil(plan.totalPages * day / 7);
  const pagesToday = logs.filter(log => log.bookId === book.id && log.createdAt && londonDay(new Date(log.createdAt)) === today).reduce((sum, log) => sum + log.pages, 0);
  const quota = Math.ceil(plan.totalPages * day / 7) - Math.ceil(plan.totalPages * (day - 1) / 7);
  return { day, pageTarget, pagesToday, quota, remainingToday: Math.max(0, quota - pagesToday), behind: Math.max(0, Math.ceil(plan.totalPages * Math.min(7, Math.max(0, elapsed)) / 7) - book.currentPage), finished: book.currentPage >= plan.totalPages, overdue: elapsed >= 7 && book.currentPage < plan.totalPages, deadline: shiftDay(plan.startDate, 6) };
}

export function validateReading(book: StoredBook, nextPage: number): string | null {
  if (!Number.isInteger(nextPage) || nextPage <= book.currentPage) return "Enter a whole page number greater than your current page.";
  if (book.totalPages <= 1 || nextPage > book.totalPages) return "Set the actual total pages first; reading cannot exceed the book's page count.";
  return null;
}
