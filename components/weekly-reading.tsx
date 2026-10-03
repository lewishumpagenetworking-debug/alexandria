"use client";
import { useEffect, useState } from "react";
import { loadBooks, loadLogs, saveBooks } from "@/lib/application-store";
import { bookPercent, startPercentageCommitment, dailyQuota, logCredit, progressLabel, executionStatus, listCommitments, startCommitment, londonDay, shiftDay } from "@/lib/reading-execution";
import { BookMetaPage } from "@/components/book-meta-page";
import { curriculumBookById, curriculumFocusById } from "@/data/curriculum";
import { loadLearningCampaign } from "@/lib/curriculum-store";

export function WeeklyReading() {
  const [books, setBooks] = useState(() => loadBooks({ includeArchived: true, includeDeleted: true }));
  const [logs, setLogs] = useState(loadLogs);
  const [plans, setPlans] = useState(listCommitments);
  const [bookId, setBookId] = useState("");
  const [total, setTotal] = useState("");
  const [message, setMessage] = useState("");
  const [metaId, setMetaId] = useState("");
  const [campaign, setCampaign] = useState(loadLearningCampaign);
  useEffect(() => {
    const sync = () => { setBooks(loadBooks({ includeArchived: true, includeDeleted: true })); setLogs(loadLogs()); setPlans(listCommitments()); setCampaign(loadLearningCampaign()); };
    sync(); window.addEventListener("alexandria:data", sync); window.addEventListener("storage", sync);
    const timer = window.setInterval(sync, 60000);
    return () => { clearInterval(timer); window.removeEventListener("alexandria:data", sync); window.removeEventListener("storage", sync); };
  }, []);
  const active = plans.find(plan => { const book = books.find(b => b.id === plan.bookId); return book && !book.completed; });
  const book = books.find(b => b.id === active?.bookId);
  const unit = active?.unit === "percentage" ? "percentage points" : "pages";
  const fmt = (value: number) => Number(value.toFixed(2));
  const status = active && book ? executionStatus(active, book, logs) : null;
  const candidates = books.filter(b => !b.completed && !b.archivedAt && !b.deletedAt && !plans.some(p => p.bookId === b.id));
  const selectedId = candidates.some(book => book.id === bookId) ? bookId : candidates[0]?.id || "";
  const selectedBook = candidates.find(b => b.id === selectedId);
  const metaBook = books.find(b => b.id === metaId);
  const campaignFocus = campaign ? curriculumFocusById(campaign.focusId) : undefined;
  const campaignCapability = campaign ? curriculumBookById(campaign.capabilityBookId) : undefined;
  const campaignLeader = campaign ? curriculumBookById(campaign.leaderBookId) : undefined;
  const today = londonDay();
  const completedDates = books.flatMap(b => b.readingFinishedAt ? [londonDay(new Date(b.readingFinishedAt))] : []);
  const monthCount = completedDates.filter(date => date.slice(0, 7) === today.slice(0, 7)).length;
  const yearCount = completedDates.filter(date => date.slice(0, 4) === today.slice(0, 4)).length;
  return <article className="card weekly-reading-card">
    <div className="kicker">Module 1 · Dual-track execution</div>
    <h2>One capability sprint. One leader in continuous study.</h2>
    <p className="meta">Capability books use a seven-day execution target. Leader biographies remain in progress until completed; depth outranks an arbitrary weekly finish.</p>
    <p className="meta top-gap">Verified finishes: {monthCount} this month · {yearCount} this year. Older finishes without a completion date are excluded.</p>
    {campaign && campaignFocus && campaignCapability && campaignLeader && <article className="study-thread top-gap"><div className="kicker">Active campaign · {campaignFocus.label}</div><p><strong>Capability:</strong> {campaignCapability.title} · <strong>Leader:</strong> {campaignLeader.title}</p><p className="meta">{campaignFocus.synthesisPrompt}</p></article>}
    {active && book && status ? <>
      <h3 className="top-gap">{book.title}{book.deletedAt ? " · In Trash" : book.archivedAt ? " · Archived" : ""}</h3>
      <div className="reading-tally-stats top-gap">
        <div><strong>{Number((active.totalPages / 7).toFixed(2))}</strong><span>{unit} / day ({active.totalPages} ÷ 7)</span></div>
        <div><strong>{fmt(status.pagesToday)} / {fmt(status.quota)}</strong><span>today’s recorded {unit}</span></div>
        <div><strong>{fmt(status.pageTarget)}{active.unit === "percentage" ? "%" : ""}</strong><span>cumulative target · day {status.day} / 7</span></div>
        <div><strong>{fmt(status.remainingToday)}</strong><span>{unit} still required today</span></div>
      </div>
      <p className={status.overdue || status.behind ? "saved-note top-gap" : "meta top-gap"}>{status.overdue ? "Deadline missed. Finish the book; the deadline remains recorded." : status.behind ? `${fmt(status.behind)} ${unit} behind the schedule entering today. Catch up and meet today's quota.` : status.remainingToday === 0 ? "Today's quota met. Keep the seven-day commitment." : "Today's quota is outstanding."} Deadline: {status.deadline} (London).</p>
      {(book.archivedAt || book.deletedAt) && <p className="meta">Restore this book from Archive or Trash in the reading tally to resume logging. This commitment retains its deadline.</p>}
      <p className="meta">{active.unit === "percentage" ? "Percentage targets distribute rounding across seven days and total exactly 100 percentage points." : `Whole-page targets distribute rounding across seven days and total exactly ${active.totalPages} pages.`} Reading another book does not satisfy this book’s quota.</p>
      <table className="reading-week-table"><caption>Seven-day reading record</caption><thead><tr><th>Date</th><th>Quota</th><th>Recorded</th><th>Status</th></tr></thead><tbody>{Array.from({ length: 7 }, (_, index) => {
        const date = shiftDay(active.startDate, index);
        const quota = dailyQuota(active, index + 1);
        const actual = logs.filter(log => log.bookId === book.id && log.createdAt && londonDay(new Date(log.createdAt)) === date).reduce((sum, log) => sum + logCredit(active, log), 0);
        return <tr key={date}><td>{date}</td><td>{fmt(quota)}</td><td>{fmt(actual)}</td><td>{date > londonDay() ? "Upcoming" : actual + 1e-7 >= quota ? "Met" : date < londonDay() ? "Missed" : "Outstanding"}</td></tr>;
      })}</tbody></table>
      <button className="small-btn top-gap" onClick={() => setMetaId(book.id)}>Open book meta page →</button>
    </> : <form className="reading-tally-form top-gap" onSubmit={event => {
      event.preventDefault(); if (!selectedBook) return;
      if (selectedBook.progressMode === "percentage") { startPercentageCommitment(selectedId, bookPercent(selectedBook)); setMessage(""); return; }
      const count = Number(total || (selectedBook.totalPages > 1 ? selectedBook.totalPages : ""));
      if (!Number.isInteger(count) || count < 1 || count <= selectedBook.currentPage) { setMessage("Enter the actual total pages, greater than the current page."); return; }
      const next = books.map(b => b.id === selectedId ? { ...b, totalPages: count } : b);
      saveBooks(next); startCommitment(selectedId, count); setMessage(""); setTotal("");
    }}>
      <label>This week’s book<select value={selectedId} onChange={event => { setBookId(event.target.value); setTotal(""); }}>{candidates.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
      {selectedBook?.progressMode === "percentage" ? <p className="meta">Voice Dream · 0–100% · 100 ÷ 7 ≈ 14.29 percentage points per day.</p> : <label>Total pages<input required type="number" min="1" step="1" value={total || (selectedBook && selectedBook.totalPages > 1 ? selectedBook.totalPages : "")} onChange={event => setTotal(event.target.value)} /></label>}
      <button className="small-btn primary" disabled={!selectedBook}>Commit to seven days →</button>
      <p className="meta">{candidates.length ? "The deadline starts today. The seven-day completion target and start date stay fixed." : "Use Start Book in the reading tally below to begin."}</p>
    </form>}
    {message && <p role="status" className="saved-note">{message}</p>}
    {plans.length > 0 && <details className="top-gap"><summary>Commitment history & book meta pages</summary><div className="list">{plans.map(plan => { const b = books.find(item => item.id === plan.bookId); if (!b) return null; const s = executionStatus(plan, b, logs);  return <div className="list-item" key={plan.bookId}><strong>{b.title}</strong><span>{plan.startDate} → {s.deadline} · {progressLabel(b)} · {s.finished ? b.readingFinishedAt ? londonDay(new Date(b.readingFinishedAt)) <= s.deadline ? "Finished on time" : "Finished late" : "Reading finished; completion timing unverified" : s.overdue ? "Deadline missed" : "In progress"}</span><button className="small-btn" onClick={() => setMetaId(b.id)}>Book meta page</button><details><summary>Daily evidence</summary>{Array.from({ length: 7 }, (_, index) => {
          const date = shiftDay(plan.startDate, index);
          const quota = dailyQuota(plan, index + 1);
          const actual = logs.filter(log => log.bookId === b.id && log.createdAt && londonDay(new Date(log.createdAt)) === date).reduce((sum, log) => sum + logCredit(plan, log), 0);
          return <p className="meta" key={date}>{date}: {fmt(actual)} / {fmt(quota)} {plan.unit === "percentage" ? "percentage points" : "pages"} · {date > today ? "Upcoming" : actual + 1e-7 >= quota ? "Met" : date < today ? "Missed" : "Outstanding"}</p>;
        })}</details></div>; })}</div></details>}
    {metaBook && <div className="top-gap"><button className="action-link" onClick={() => setMetaId("")}>Close meta page</button><BookMetaPage key={metaBook.id} book={metaBook} /></div>}
  </article>;
}
