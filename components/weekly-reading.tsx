"use client";
import { useEffect, useState } from "react";
import { loadBooks, loadLogs, saveBooks } from "@/lib/application-store";
import {
  bookPercent,
  startPercentageCommitment,
  restartPercentageCommitment,
  dailyQuota,
  logCredit,
  progressLabel,
  executionStatus,
  listCommitments,
  startCommitment,
  restartCommitment,
  stopCommitment,
  londonDay,
  shiftDay,
} from "@/lib/reading-execution";
import { BookMetaPage } from "@/components/book-meta-page";
import { curriculumBookById, curriculumFocusById } from "@/data/curriculum";
import { loadLearningCampaign } from "@/lib/curriculum-store";

function mondayOfWeek(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = date.getUTCDay();
  return shiftDay(day, weekday === 0 ? -6 : 1 - weekday);
}

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
    const sync = () => {
      setBooks(loadBooks({ includeArchived: true, includeDeleted: true }));
      setLogs(loadLogs());
      setPlans(listCommitments());
      setCampaign(loadLearningCampaign());
    };
    sync();
    window.addEventListener("alexandria:data", sync);
    window.addEventListener("storage", sync);
    const timer = window.setInterval(sync, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("alexandria:data", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const fmt = (value: number) => Number(value.toFixed(2));
  const today = londonDay();
  const weekStart = mondayOfWeek(today);
  const weekEnd = shiftDay(weekStart, 6);
  const completedDates = books.flatMap(book => book.readingFinishedAt ? [londonDay(new Date(book.readingFinishedAt))] : []);
  const weekCount = completedDates.filter(date => date >= weekStart && date <= weekEnd).length;
  const monthCount = completedDates.filter(date => date.slice(0, 7) === today.slice(0, 7)).length;
  const yearCount = completedDates.filter(date => date.slice(0, 4) === today.slice(0, 4)).length;

  const activePlans = plans.flatMap(plan => {
    const book = books.find(item => item.id === plan.bookId);
    if (!book || book.completed) return [];
    return [{ plan, book, status: executionStatus(plan, book, logs) }];
  });
  const candidates = books.filter(book =>
    !book.completed &&
    !book.archivedAt &&
    !book.deletedAt &&
    !plans.some(plan => plan.bookId === book.id)
  );
  const selectedId = candidates.some(book => book.id === bookId) ? bookId : candidates[0]?.id || "";
  const selectedBook = candidates.find(book => book.id === selectedId);
  const metaBook = books.find(book => book.id === metaId);

  const campaignFocus = campaign ? curriculumFocusById(campaign.focusId) : undefined;
  const campaignCapability = campaign ? curriculumBookById(campaign.capabilityBookId) : undefined;
  const campaignLeader = campaign ? curriculumBookById(campaign.leaderBookId) : undefined;

  function restart(planBookId: string) {
    const book = books.find(item => item.id === planBookId);
    const plan = plans.find(item => item.bookId === planBookId);
    if (!book || !plan) return;
    if (!window.confirm(`Restart the seven-day target for "${book.title}" from today? Existing reading progress and logs stay intact.`)) return;
    if (plan.unit === "percentage") restartPercentageCommitment(book.id, bookPercent(book));
    else restartCommitment(book.id, book.totalPages > 1 ? book.totalPages : plan.totalPages);
    setMessage(`${book.title}: seven-day target restarted from today.`);
  }

  function stop(planBookId: string) {
    const book = books.find(item => item.id === planBookId);
    if (!book) return;
    if (!window.confirm(`Stop weekly tracking for "${book.title}"? The book, notes, reading progress, and logs stay intact.`)) return;
    stopCommitment(book.id);
    setMessage(`${book.title}: weekly tracking stopped. You can start or switch to any other book.`);
  }

  return <article className="card weekly-reading-card">
    <div className="kicker">Module 1 · Flexible weekly execution</div>
    <h2>Hit the weekly target. Track whatever books help you get there.</h2>
    <p className="meta">Alexandria no longer locks you into one active book. Start, switch, pause, restart, reimport, or track multiple books whenever useful. The outcome target is at least one completed book per week.</p>

    <div className="reading-tally-stats top-gap">
      <div><strong>{weekCount >= 1 ? "✓" : weekCount}</strong><span>{weekCount >= 1 ? "weekly target hit" : "books completed this week"}</span></div>
      <div><strong>{activePlans.length}</strong><span>books currently tracked</span></div>
      <div><strong>{monthCount}</strong><span>verified finishes this month</span></div>
      <div><strong>{yearCount}</strong><span>verified finishes this year</span></div>
    </div>
    <p className={weekCount >= 1 ? "saved-note top-gap" : "meta top-gap"}>Weekly window: {weekStart} → {weekEnd}. {weekCount >= 1 ? "Target achieved. Any additional reading is upside." : "Complete any one book this week to hit the target; no single book is mandatory."}</p>

    {campaign && campaignFocus && campaignCapability && campaignLeader && <article className="study-thread top-gap">
      <div className="kicker">Active campaign · {campaignFocus.label}</div>
      <p><strong>Capability:</strong> {campaignCapability.title} · <strong>Leader:</strong> {campaignLeader.title}</p>
      <p className="meta">{campaignFocus.synthesisPrompt}</p>
    </article>}

    {activePlans.length > 0 && <section className="top-gap">
      <div className="kicker">Active reading targets · no exclusivity</div>
      <div className="list">
        {activePlans.map(({ plan, book, status }) => {
          const unit = plan.unit === "percentage" ? "percentage points" : "pages";
          return <article className="list-item" key={book.id}>
            <strong>{book.title}{book.deletedAt ? " · In Trash" : book.archivedAt ? " · Archived" : ""}</strong>
            <span>{plan.startDate} → {status.deadline} · day {status.day}/7 · {progressLabel(book)}</span>
            <div className="reading-tally-stats top-gap">
              <div><strong>{fmt(status.pagesToday)} / {fmt(status.quota)}</strong><span>today’s {unit}</span></div>
              <div><strong>{fmt(status.pageTarget)}{plan.unit === "percentage" ? "%" : ""}</strong><span>cumulative target</span></div>
              <div><strong>{fmt(status.remainingToday)}</strong><span>{unit} remaining today</span></div>
              <div><strong>{status.overdue ? "Missed" : status.behind ? "Behind" : status.finished ? "Done" : "Active"}</strong><span>tracking status</span></div>
            </div>
            <p className="meta top-gap">{status.overdue ? "This target missed its original deadline; it does not block another book." : status.behind ? `${fmt(status.behind)} ${unit} behind this target. Continue, restart, or stop tracking—your choice.` : "This target is informational. Other books can be read and tracked simultaneously."}</p>
            <div className="button-row top-gap">
              <button className="small-btn" onClick={() => setMetaId(book.id)}>Book meta page</button>
              <button className="small-btn" onClick={() => restart(book.id)}>Restart 7-day target</button>
              <button className="small-btn" onClick={() => stop(book.id)}>Stop weekly tracking</button>
            </div>
            <details className="top-gap"><summary>Seven-day evidence</summary>
              {Array.from({ length: 7 }, (_, index) => {
                const date = shiftDay(plan.startDate, index);
                const quota = dailyQuota(plan, index + 1);
                const actual = logs
                  .filter(log => log.bookId === book.id && log.createdAt && londonDay(new Date(log.createdAt)) === date)
                  .reduce((sum, log) => sum + logCredit(plan, log), 0);
                return <p className="meta" key={date}>{date}: {fmt(actual)} / {fmt(quota)} {unit} · {date > today ? "Upcoming" : actual + 1e-7 >= quota ? "Met" : date < today ? "Missed" : "Outstanding"}</p>;
              })}
            </details>
          </article>;
        })}
      </div>
    </section>}

    <form className="reading-tally-form top-gap" onSubmit={event => {
      event.preventDefault();
      if (!selectedBook) return;
      if (selectedBook.progressMode === "percentage") {
        startPercentageCommitment(selectedId, bookPercent(selectedBook));
        setMessage(`${selectedBook.title}: tracking started. Existing book targets remain active.`);
        return;
      }
      const count = Number(total || (selectedBook.totalPages > 1 ? selectedBook.totalPages : ""));
      if (!Number.isInteger(count) || count < 1 || count <= selectedBook.currentPage) {
        setMessage("Enter the actual total pages, greater than the current page.");
        return;
      }
      const next = books.map(book => book.id === selectedId ? { ...book, totalPages: count } : book);
      saveBooks(next);
      startCommitment(selectedId, count);
      setMessage(`${selectedBook.title}: tracking started. Existing book targets remain active.`);
      setTotal("");
    }}>
      <div className="kicker">Start tracking another book</div>
      <label>Book<select value={selectedId} onChange={event => { setBookId(event.target.value); setTotal(""); }}>
        {candidates.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
      </select></label>
      {selectedBook?.progressMode === "percentage"
        ? <p className="meta">Voice Dream · 0–100% · seven-day pacing is guidance only.</p>
        : selectedBook
          ? <label>Total pages<input required type="number" min="1" step="1" value={total || (selectedBook.totalPages > 1 ? selectedBook.totalPages : "")} onChange={event => setTotal(event.target.value)} /></label>
          : null}
      <button className="small-btn primary" disabled={!selectedBook}>Start tracking this book →</button>
      <p className="meta">{candidates.length ? "This adds another target. It does not pause, cancel, or block any other book." : "Every available book is already tracked or completed. Start another book in the reading tally, or restart/stop one of the targets above."}</p>
    </form>

    {message && <p role="status" className="saved-note">{message}</p>}

    {plans.length > 0 && <details className="top-gap"><summary>All tracked books & meta pages</summary>
      <div className="list">{plans.map(plan => {
        const book = books.find(item => item.id === plan.bookId);
        if (!book) return null;
        const status = executionStatus(plan, book, logs);
        return <div className="list-item" key={plan.bookId}>
          <strong>{book.title}</strong>
          <span>{plan.startDate} → {status.deadline} · {progressLabel(book)} · {status.finished ? "Reading finished" : status.overdue ? "Original target missed" : "In progress"}</span>
          <button className="small-btn" onClick={() => setMetaId(book.id)}>Book meta page</button>
        </div>;
      })}</div>
    </details>}

    {metaBook && <div className="top-gap">
      <button className="action-link" onClick={() => setMetaId("")}>Close meta page</button>
      <BookMetaPage key={metaBook.id} book={metaBook} />
    </div>}
  </article>;
}
