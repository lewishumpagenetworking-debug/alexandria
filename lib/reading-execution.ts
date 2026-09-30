import type { ReadingLog, StoredBook } from "./application-store";

export interface ReadingCommitment {
  bookId: string;
  startDate: string;
  totalPages: number;
  unit?: "percentage";
  pageTotal?: number;
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
export function bookPercent(book: StoredBook): number {
  return book.currentPercent ?? (book.totalPages > 1 ? book.currentPage / book.totalPages * 100 : 0);
}
export function progressLabel(book: StoredBook): string {
  return book.progressMode === "percentage" ? `${Number(bookPercent(book).toFixed(2))}% complete` : `${book.currentPage} / ${book.totalPages > 1 ? book.totalPages : "?"} pages`;
}
export function dailyQuota(plan: ReadingCommitment, day: number): number {
  const target = (d: number) => plan.unit === "percentage" ? Math.ceil(10000 * d / 7) / 100 : Math.ceil(plan.totalPages * d / 7);
  return Number((target(day) - target(day - 1)).toFixed(8));
}
export function logCredit(plan: ReadingCommitment, log: ReadingLog): number {
  return log.progressPercent !== undefined ? log.progressPercent * (plan.unit === "percentage" ? 1 : plan.totalPages / 100) : plan.unit === "percentage" ? (plan.pageTotal ? log.pages / plan.pageTotal * 100 : 0) : log.pages;
}
export function usePercentageCommitment(bookId: string, pageTotal: number): void {
  const plans = listCommitments();
  localStorage.setItem(KEY, JSON.stringify(plans.map(plan => plan.bookId === bookId && plan.unit !== "percentage" ? { ...plan, totalPages: 100, unit: "percentage", pageTotal } : plan)));
}
export function startPercentageCommitment(bookId: string, startingPercent = 0): void {
  if (!Number.isFinite(startingPercent) || startingPercent < 0 || startingPercent >= 100) throw new Error("Starting percentage must be between 0 and 100, excluding 100.");
  if (listCommitments().some(plan => plan.bookId === bookId)) throw new Error("This book already has a fixed reading commitment.");
  localStorage.setItem(KEY, JSON.stringify([...listCommitments(), { bookId, totalPages: 100, unit: "percentage", startDate: londonDay() }]));
  window.dispatchEvent(new Event("alexandria:data"));
}
export function executionStatus(plan: ReadingCommitment, book: StoredBook, logs: ReadingLog[], today = londonDay()) {
  const elapsed = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${plan.startDate}T12:00:00Z`)) / 86400000);
  const day = Math.max(1, Math.min(7, elapsed + 1));
  const pageTarget = plan.unit === "percentage" ? Math.ceil(10000 * day / 7) / 100 : Math.ceil(plan.totalPages * day / 7);
  const pagesToday = logs.filter(log => log.bookId === book.id && log.createdAt && londonDay(new Date(log.createdAt)) === today).reduce((sum, log) => sum + logCredit(plan, log), 0);
  const quota = dailyQuota(plan, day);
  const progress = plan.unit === "percentage" ? bookPercent(book) : book.currentPercent !== undefined ? book.currentPercent / 100 * plan.totalPages : book.currentPage;
  return { day, pageTarget, pagesToday: Number(pagesToday.toFixed(8)), quota, remainingToday: Math.max(0, quota - pagesToday), behind: Math.max(0, (plan.unit === "percentage" ? Math.ceil(10000 * Math.min(7, Math.max(0, elapsed)) / 7) / 100 : Math.ceil(plan.totalPages * Math.min(7, Math.max(0, elapsed)) / 7)) - progress), finished: progress >= plan.totalPages, overdue: elapsed >= 7 && progress < plan.totalPages, deadline: shiftDay(plan.startDate, 6) };
}

export function validateReading(book: StoredBook, nextPage: number): string | null {
  if (!Number.isInteger(nextPage) || nextPage <= book.currentPage) return "Enter a whole page number greater than your current page.";
  if (book.totalPages <= 1 || nextPage > book.totalPages) return "Set the actual total pages first; reading cannot exceed the book's page count.";
  return null;
}
