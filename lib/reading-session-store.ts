import { loadBooks, loadLogs, saveBooks, saveLogs, uid, type ReadingLog, type ReadingMethod } from "./application-store";
import { bookPercent, listCommitments, startPercentageCommitment, usePercentageCommitment, validateReading } from "./reading-execution";

export function recordReadingSession(input: {
  bookId: string; mode: "pages" | "current" | "percentage"; value?: number; minutes: number;
  method: ReadingMethod; format: "physical" | "kindle" | "pdf";
  voiceWpm?: number; audioSpeed?: number; listeningContext?: string; comfortableSpeed?: number; trainingSpeed?: number;
}): ReadingLog {
  const books = loadBooks();
  const book = books.find(item => item.id === input.bookId);
  if (!book) throw new Error("Choose an active book.");
  if (input.mode === "percentage") {
    if (book.totalPages <= 1 && book.progressMode !== "percentage") throw new Error("Set up this book’s voice duration and percentage tracking first.");
    const from = bookPercent(book), to = Number(input.value);
    if (!Number.isFinite(to) || to <= from || to > 100) throw new Error("Enter a percentage above your saved progress and at most 100.");
    if (!input.voiceWpm || !Number.isFinite(input.voiceWpm) || input.voiceWpm <= 0) throw new Error("Enter a positive voice speed in words per minute.");
    if (!Number.isFinite(input.minutes) || input.minutes < 0) throw new Error("Session minutes cannot be negative.");
    const delta = Number((to - from).toFixed(8));
    const log: ReadingLog = { id: uid("log"), bookId: book.id, bookTitle: book.title, pages: 0, progressPercent: delta, fromPercent: from, toPercent: to, voiceWpm: input.voiceWpm, estimatedMinutes: estimateVoiceMinutes(book, delta, input.voiceWpm), minutes: input.minutes, method: input.method, format: "audiobook", listeningContext: input.listeningContext, date: new Date().toLocaleDateString("en-GB"), createdAt: new Date().toISOString() };
    saveBooks(books.map(item => item.id === book.id ? { ...item, currentPercent: to, currentPage: book.progressMode === "percentage" ? book.currentPage : Math.floor(book.totalPages * to / 100), voiceWpm: input.voiceWpm, lastRead: "Today" } : item));
    saveLogs([log, ...loadLogs()]); window.dispatchEvent(new Event("alexandria:data")); return log;
  }
  if (book.progressMode === "percentage") throw new Error("Log this book using its percentage progress.");
  const listeningOnly = input.method === "listening";
  if (!Number.isFinite(input.minutes) || input.minutes < 0 || (input.method !== "reading" && input.minutes <= 0)) throw new Error("Enter the actual session minutes.");
  if (input.method !== "reading" && (!input.audioSpeed || !Number.isFinite(input.audioSpeed) || input.audioSpeed <= 0 || [input.comfortableSpeed, input.trainingSpeed].some(speed => speed !== undefined && (!Number.isFinite(speed) || speed <= 0)))) throw new Error("Audio speeds must be positive numbers.");
  const nextPage = listeningOnly ? book.currentPage : input.mode === "current" ? Number(input.value) : book.currentPage + Number(input.value);
  if (!listeningOnly) {
    const error = validateReading(book, nextPage);
    if (error) throw new Error(error);
  }
  const pages = listeningOnly ? 0 : Number((nextPage - (book.currentPercent !== undefined ? book.currentPercent / 100 * book.totalPages : book.currentPage)).toFixed(8));
  const log: ReadingLog = { id: uid("log"), bookId: book.id, bookTitle: book.title, pages, minutes: input.minutes, method: input.method, format: listeningOnly ? "audiobook" : input.format, audioSpeed: input.method === "reading" ? undefined : input.audioSpeed, audioMinutes: input.method === "reading" ? undefined : input.minutes, listeningContext: input.method === "reading" ? undefined : input.listeningContext, comfortableSpeed: input.comfortableSpeed, trainingSpeed: input.trainingSpeed, date: new Date().toLocaleDateString("en-GB"), createdAt: new Date().toISOString() };
  if (!listeningOnly) saveBooks(books.map(item => item.id === book.id ? { ...item, currentPage: nextPage, currentPercent: undefined, lastRead: "Today" } : item));
  saveLogs([log, ...loadLogs()]);
  window.dispatchEvent(new Event("alexandria:data"));
  return log;
}

export function estimateVoiceMinutes(book: { voiceTotalMinutes?: number; voiceReferenceWpm?: number }, percentagePoints: number, wpm: number): number | undefined {
  if (!book.voiceTotalMinutes || !book.voiceReferenceWpm || !Number.isFinite(wpm) || wpm <= 0) return undefined;
  return book.voiceTotalMinutes * book.voiceReferenceWpm / wpm * percentagePoints / 100;
}
export function configureVoiceBook(bookId: string, totalMinutes: number, referenceWpm: number, startingPercent?: number): void {
  const books = loadBooks(), book = books.find(b => b.id === bookId);
  if (!book) throw new Error("Choose an active book.");
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0 || !Number.isFinite(referenceWpm) || referenceWpm <= 0) throw new Error("Enter a positive full-book duration and its reference WPM.");
  const plan = listCommitments().find(p => p.bookId === bookId);
  if (startingPercent !== undefined && (plan || loadLogs().some(l => l.bookId === bookId))) throw new Error("Starting progress is locked after tracking begins.");
  if (startingPercent !== undefined && (!Number.isFinite(startingPercent) || startingPercent < 0 || startingPercent >= 100)) throw new Error("Starting percentage must be from 0 up to, but below, 100.");
  if (!plan && listCommitments().some(p => loadBooks({ includeArchived: true, includeDeleted: true }).some(b => b.id === p.bookId && !b.completed))) throw new Error("Finish the existing weekly commitment first; its deadline is unchanged.");
  saveBooks(books.map(b => b.id === bookId ? { ...b, progressMode: "percentage", currentPercent: startingPercent ?? bookPercent(b), currentPage: b.currentPage, voiceTotalMinutes: totalMinutes, voiceReferenceWpm: referenceWpm, voiceWpm: b.voiceWpm ?? referenceWpm } : b));
  if (!plan) startPercentageCommitment(bookId, startingPercent);
  else if (plan.unit !== "percentage") usePercentageCommitment(bookId, book.totalPages);
  window.dispatchEvent(new Event("alexandria:data"));
}
