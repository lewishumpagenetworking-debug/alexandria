"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBooks, loadLogs, saveBooks, saveLogs, uid } from "@/lib/application-store";
import { londonDay, validateReading } from "@/lib/reading-execution";
import { listHighlights } from "@/lib/library-notes-store";
import { awardPoints, POINTS } from "@/lib/points-store";

function dayKey(date: Date) {
  return londonDay(date);
}

export function DailyReadingTally() {
  const [books, setBooks] = useState(() => loadBooks());
  const [logs, setLogs] = useState(() => loadLogs());
  const [bookId, setBookId] = useState(() => loadBooks().find((book) => !book.completed)?.id ?? loadBooks()[0]?.id ?? "");
  const [mode, setMode] = useState<"pages" | "current">("current");
  const [value, setValue] = useState("");
  const [minutes, setMinutes] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () => {
      setBooks(loadBooks());
      setLogs(loadLogs());
    };
    window.addEventListener("alexandria:data", sync);
    return () => window.removeEventListener("alexandria:data", sync);
  }, []);

  const today = dayKey(new Date());
  const todaysLogs = logs.filter((log) => log.createdAt && londonDay(new Date(log.createdAt)) === today);
  const pagesToday = todaysLogs.reduce((sum, log) => sum + (log.pages ?? 0), 0);

  const last7 = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, index) => dayKey(new Date(Date.now() - index * 86400000)));
    return keys.map((key) => logs.filter((log) => log.createdAt && londonDay(new Date(log.createdAt)) === key).reduce((sum, log) => sum + (log.pages ?? 0), 0));
  }, [logs]);
  const average7 = Math.round(last7.reduce((sum, pages) => sum + pages, 0) / 7);
  const highlightsToday = listHighlights().filter((item) => item.capturedAt?.startsWith(today)).length;
  const knowledgeRate = pagesToday > 0 ? Math.round((highlightsToday / pagesToday) * 10 * 10) / 10 : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const book = books.find((item) => item.id === bookId);
    const numeric = Math.max(0, Number(value) || 0);
    if (!book || numeric <= 0) return;

    const pagesRead = mode === "current"
      ? Math.max(0, numeric - book.currentPage)
      : numeric;
    const nextPage = mode === "current"
      ? Math.max(book.currentPage, numeric)
      : book.currentPage + pagesRead;
    const error = validateReading(book, nextPage);
    if (error) { setMessage(error); return; }

    const nextBooks = books.map((item) => item.id === book.id ? {
      ...item,
      currentPage: nextPage,
      totalPages: item.totalPages,
      completed: item.totalPages > 1 ? nextPage >= item.totalPages : item.completed,
      lastRead: "Today",
    } : item);

    const nextLogs = [{
      id: uid("log"),
      bookId: book.id,
      bookTitle: book.title,
      pages: pagesRead,
      minutes: Math.max(0, Number(minutes) || 0),
      date: new Date().toLocaleDateString("en-GB"),
      createdAt: new Date().toISOString(),
    }, ...logs];

    saveBooks(nextBooks);
    saveLogs(nextLogs);
    awardPoints("reading-session", `Daily tally · ${pagesRead} pages · ${book.title}`, POINTS.readingSession);
    setBooks(nextBooks);
    setLogs(nextLogs);
    setValue("");
    setMinutes("");
    setMessage(pagesRead > 0 ? `Recorded ${pagesRead} pages in ${book.title}.` : `Updated ${book.title} to page ${nextPage}.`);
    window.dispatchEvent(new Event("alexandria:data"));
  }

  return <article className="card reading-tally-card">
    <div className="kicker">Daily reading tally</div>
    <h2>Close the day with a page count.</h2>
    <p className="meta">Enter either pages read today or the page you are now on. Alexandria calculates the daily change and keeps a dated history.</p>

    <form className="reading-tally-form top-gap" onSubmit={submit}>
      <label>Book
        <select value={bookId} onChange={(event) => setBookId(event.target.value)}>
          {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
        </select>
      </label>
      <label>Input type
        <select value={mode} onChange={(event) => setMode(event.target.value as "pages" | "current")}>
          <option value="current">Current page</option>
          <option value="pages">Pages read today</option>
        </select>
      </label>
      <label>{mode === "current" ? "Page now" : "Pages read"}
        <input type="number" min="0" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} placeholder={mode === "current" ? "e.g. 148" : "e.g. 24"} />
      </label>
      <label>Minutes <span className="optional">optional</span>
        <input type="number" min="0" inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="e.g. 35" />
      </label>
      <button className="small-btn primary" type="submit" disabled={!bookId || !value}>Save daily reading →</button>
    </form>

    {message && <p className="saved-note top-gap">{message}</p>}

    <div className="reading-tally-stats top-gap">
      <div><strong>{pagesToday}</strong><span>pages today</span></div>
      <div><strong>{average7}</strong><span>7-day avg / day</span></div>
      <div><strong>{highlightsToday}</strong><span>knowledge captures today</span></div>
      <div><strong>{knowledgeRate}</strong><span>captures per 10 pages</span></div>
    </div>

    <p className="meta top-gap">Record the pages you actually read. Your fixed daily requirement is shown in the weekly commitment above.</p>
  </article>;
}
