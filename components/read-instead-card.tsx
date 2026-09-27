"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBooks, loadLogs, saveLogs, uid } from "@/lib/application-store";
import { abandonHabitReplacement, completeHabitReplacement, getActiveHabitReplacement, getHabitStats, startHabitReplacement } from "@/lib/habit-store";
import { awardPoints, POINTS } from "@/lib/points-store";

const OPTIONS = [10, 20, 30];

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ReadInsteadCard() {
  const books = useMemo(() => loadBooks().filter((book) => !book.completed), []);
  const [bookId, setBookId] = useState(books[0]?.id ?? "");
  const [minutes, setMinutes] = useState(10);
  const [active, setActive] = useState(() => getActiveHabitReplacement());
  const [remaining, setRemaining] = useState(0);
  const [stats, setStats] = useState(() => getHabitStats());

  useEffect(() => {
    if (!active) { setRemaining(0); return; }
    const update = () => {
      const target = new Date(active.startedAt).getTime() + active.targetMinutes * 60000;
      setRemaining(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    const sync = () => {
      setActive(getActiveHabitReplacement());
      setStats(getHabitStats());
    };
    window.addEventListener("alexandria:data", sync);
    return () => window.removeEventListener("alexandria:data", sync);
  }, []);

  function start() {
    const book = books.find((item) => item.id === bookId);
    setActive(startHabitReplacement({ bookId: book?.id, bookTitle: book?.title, targetMinutes: minutes }));
  }

  function complete() {
    const finished = completeHabitReplacement();
    if (!finished) return;
    const logs = loadLogs();
    saveLogs([{
      id: uid("log"),
      bookId: finished.bookId ?? "habit-reading",
      bookTitle: finished.bookTitle ?? "Reading sprint",
      pages: 0,
      minutes: finished.actualMinutes ?? finished.targetMinutes,
      date: new Date().toLocaleDateString("en-GB"),
      createdAt: new Date().toISOString(),
    }, ...logs]);
    awardPoints("reading-session", `Read instead · ${finished.bookTitle ?? "reading"}`, POINTS.readingSession);
    window.dispatchEvent(new Event("alexandria:data"));
    setActive(null);
    setStats(getHabitStats());
  }

  function abandon() {
    abandonHabitReplacement();
    setActive(null);
    setStats(getHabitStats());
  }

  return <article className="card read-instead-card">
    <div className="kicker">Habit replacement</div>
    <h2>Read instead of scroll.</h2>
    <p className="meta">When you notice the impulse to open social media, redirect it into a short reading sprint. Alexandria tracks the choice, not your other apps.</p>

    {!active ? <>
      <div className="form-grid compact-form top-gap">
        <label>Book
          <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            {books.length ? books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>) : <option value="">General reading</option>}
          </select>
        </label>
        <label>Replacement sprint
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {OPTIONS.map((option) => <option key={option} value={option}>{option} minutes</option>)}
          </select>
        </label>
      </div>
      <button className="small-btn primary top-gap" onClick={start}>I was about to scroll — read instead →</button>
    </> : <div className="habit-active top-gap">
      <div>
        <div className="kicker">Reading now · {active.bookTitle ?? "General reading"}</div>
        <strong className="habit-timer">{formatRemaining(remaining)}</strong>
        <p className="meta">{remaining > 0 ? "Keep the phone down and read. Return when the sprint ends." : "Sprint complete. Record the choice."}</p>
      </div>
      <div className="button-row">
        <button className="small-btn" onClick={abandon}>Stop</button>
        <button className="small-btn primary" onClick={complete} disabled={remaining > 0}>Complete reading sprint</button>
      </div>
    </div>}

    <div className="habit-stats top-gap">
      <div><strong>{stats.replacements}</strong><span>scroll impulses redirected</span></div>
      <div><strong>{stats.minutes}</strong><span>minutes reclaimed for reading</span></div>
      <div><strong>{stats.readingChoiceDays}</strong><span>days choosing reading</span></div>
    </div>
  </article>;
}
