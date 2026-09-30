"use client";
import { useEffect, useState } from "react";
import { loadBooks, loadLogs, saveBooks } from "@/lib/application-store";
import { executionStatus, listCommitments, startCommitment, londonDay, shiftDay } from "@/lib/reading-execution";
import { BookMetaPage } from "@/components/book-meta-page";

export function WeeklyReading() {
  const [books, setBooks] = useState(loadBooks);
  const [logs, setLogs] = useState(loadLogs);
  const [plans, setPlans] = useState(listCommitments);
  const [bookId, setBookId] = useState("");
  const [total, setTotal] = useState("");
  const [message, setMessage] = useState("");
  const [metaId, setMetaId] = useState("");
  useEffect(() => {
    const sync = () => { setBooks(loadBooks()); setLogs(loadLogs()); setPlans(listCommitments()); };
    sync(); window.addEventListener("alexandria:data", sync); window.addEventListener("storage", sync);
    const timer = window.setInterval(sync, 60000);
    return () => { clearInterval(timer); window.removeEventListener("alexandria:data", sync); window.removeEventListener("storage", sync); };
  }, []);
  const active = plans.find(plan => { const book = books.find(b => b.id === plan.bookId); return book && book.currentPage < plan.totalPages; });
  const book = books.find(b => b.id === active?.bookId);
  const status = active && book ? executionStatus(active, book, logs) : null;
  const candidates = books.filter(b => !b.completed && !plans.some(p => p.bookId === b.id));
  const selectedId = bookId || candidates[0]?.id || "";
  const selectedBook = books.find(b => b.id === selectedId);
  const metaBook = books.find(b => b.id === metaId);
  const today = londonDay();
  const completedDates = books.flatMap(b => b.readingFinishedAt ? [londonDay(new Date(b.readingFinishedAt))] : []);
  const monthCount = completedDates.filter(date => date.slice(0, 7) === today.slice(0, 7)).length;
  const yearCount = completedDates.filter(date => date.slice(0, 4) === today.slice(0, 4)).length;
  return <article className="card weekly-reading-card">
    <div className="kicker">Module 1 · Non-negotiable execution</div>
    <h2>One book. Seven days.</h2>
    <p className="meta">1 book per week · 4 books per month · 48 books per year</p>
    <p className="meta top-gap">Verified finishes: {monthCount} / 4 this month · {yearCount} / 48 this year. Older finishes without a completion date are excluded.</p>
    {active && book && status ? <>
      <h3 className="top-gap">{book.title}</h3>
      <div className="reading-tally-stats top-gap">
        <div><strong>{Number((active.totalPages / 7).toFixed(2))}</strong><span>pages / day ({active.totalPages} ÷ 7)</span></div>
        <div><strong>{status.pagesToday} / {status.quota}</strong><span>today’s recorded pages</span></div>
        <div><strong>{status.pageTarget}</strong><span>reach this page · day {status.day} / 7</span></div>
        <div><strong>{status.remainingToday}</strong><span>pages still required today</span></div>
      </div>
      <p className={status.overdue || status.behind ? "saved-note top-gap" : "meta top-gap"}>{status.overdue ? "Deadline missed. Finish the book; the deadline remains recorded." : status.behind ? `${status.behind} pages behind the schedule entering today. Catch up and meet today's quota.` : status.remainingToday === 0 ? "Today's quota met. Keep the seven-day commitment." : "Today's quota is outstanding."} Deadline: {status.deadline} (London).</p>
      <p className="meta">Whole-page targets distribute rounding across seven days and total exactly {active.totalPages} pages. Reading another book does not satisfy this book’s quota.</p>
      <table className="reading-week-table"><caption>Seven-day reading record</caption><thead><tr><th>Date</th><th>Quota</th><th>Recorded</th><th>Status</th></tr></thead><tbody>{Array.from({ length: 7 }, (_, index) => {
        const date = shiftDay(active.startDate, index);
        const quota = Math.ceil(active.totalPages * (index + 1) / 7) - Math.ceil(active.totalPages * index / 7);
        const actual = logs.filter(log => log.bookId === book.id && log.createdAt && londonDay(new Date(log.createdAt)) === date).reduce((sum, log) => sum + log.pages, 0);
        return <tr key={date}><td>{date}</td><td>{quota}</td><td>{actual}</td><td>{date > londonDay() ? "Upcoming" : actual >= quota ? "Met" : date < londonDay() ? "Missed" : "Outstanding"}</td></tr>;
      })}</tbody></table>
      <button className="small-btn top-gap" onClick={() => setMetaId(book.id)}>Open book meta page →</button>
    </> : <form className="reading-tally-form top-gap" onSubmit={event => {
      event.preventDefault(); if (!selectedBook) return;
      const count = Number(total || (selectedBook.totalPages > 1 ? selectedBook.totalPages : ""));
      if (!Number.isInteger(count) || count < 1 || count <= selectedBook.currentPage) { setMessage("Enter the actual total pages, greater than the current page."); return; }
      const next = books.map(b => b.id === selectedId ? { ...b, totalPages: count } : b);
      saveBooks(next); startCommitment(selectedId, count); setMessage(""); setTotal("");
    }}>
      <label>This week’s book<select value={selectedId} onChange={event => { setBookId(event.target.value); setTotal(""); }}>{candidates.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
      <label>Total pages<input required type="number" min="1" step="1" value={total || (selectedBook && selectedBook.totalPages > 1 ? selectedBook.totalPages : "")} onChange={event => setTotal(event.target.value)} /></label>
      <button className="small-btn primary" disabled={!selectedBook}>Commit to seven days →</button>
      <p className="meta">{candidates.length ? "The deadline starts today. Total pages and start date are fixed for this commitment." : "Add your next book in the Library to begin."}</p>
    </form>}
    {message && <p role="status" className="saved-note">{message}</p>}
    {plans.length > 0 && <details className="top-gap"><summary>Commitment history & book meta pages</summary><div className="list">{plans.map(plan => { const b = books.find(item => item.id === plan.bookId); if (!b) return null; const s = executionStatus(plan, b, logs);  return <div className="list-item" key={plan.bookId}><strong>{b.title}</strong><span>{plan.startDate} → {s.deadline} · {b.currentPage}/{plan.totalPages} pages · {s.finished ? b.readingFinishedAt ? londonDay(new Date(b.readingFinishedAt)) <= s.deadline ? "Finished on time" : "Finished late" : "Reading finished; completion timing unverified" : s.overdue ? "Deadline missed" : "In progress"}</span><button className="small-btn" onClick={() => setMetaId(b.id)}>Book meta page</button><details><summary>Daily evidence</summary>{Array.from({ length: 7 }, (_, index) => {
          const date = shiftDay(plan.startDate, index);
          const quota = Math.ceil(plan.totalPages * (index + 1) / 7) - Math.ceil(plan.totalPages * index / 7);
          const actual = logs.filter(log => log.bookId === b.id && log.createdAt && londonDay(new Date(log.createdAt)) === date).reduce((sum, log) => sum + log.pages, 0);
          return <p className="meta" key={date}>{date}: {actual} / {quota} pages · {date > today ? "Upcoming" : actual >= quota ? "Met" : date < today ? "Missed" : "Outstanding"}</p>;
        })}</details></div>; })}</div></details>}
    {metaBook && <div className="top-gap"><button className="action-link" onClick={() => setMetaId("")}>Close meta page</button><BookMetaPage key={metaBook.id} book={metaBook} /></div>}
  </article>;
}
