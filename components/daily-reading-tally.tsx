"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBooks, loadLogs, type ReadingMethod } from "@/lib/application-store";
import { bookPercent, londonDay } from "@/lib/reading-execution";
import { estimateVoiceMinutes, recordReadingSession } from "@/lib/reading-session-store";
import { VoiceBookSetup } from "@/components/voice-book-setup";
import { listHighlights } from "@/lib/library-notes-store";
import { awardPoints, POINTS } from "@/lib/points-store";

function dayKey(date: Date) {
  return londonDay(date);
}

export function DailyReadingTally({ sourceId }: { sourceId?: string } = {}) {
  const [books, setBooks] = useState(() => loadBooks());
  const [logs, setLogs] = useState(() => loadLogs());
  const [bookId, setBookId] = useState(() => loadBooks().find((book) => !book.completed)?.id ?? loadBooks()[0]?.id ?? "");
  const [mode, setMode] = useState<"pages" | "current" | "percentage">("current");
  const [value, setValue] = useState("");
  const [minutes, setMinutes] = useState("");
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<ReadingMethod>(sourceId && loadBooks().find(b => b.id === sourceId)?.progressMode === "percentage" ? "listening" : "reading");
  const [format, setFormat] = useState<"physical" | "kindle" | "pdf">("physical");
  const [voiceWpm, setVoiceWpm] = useState("150");
  const [audioSpeed, setAudioSpeed] = useState("1");
  const [listeningContext, setListeningContext] = useState("Focused session");
  const [comfortableSpeed, setComfortableSpeed] = useState("");
  const [trainingSpeed, setTrainingSpeed] = useState("");

  useEffect(() => {
    const sync = () => {
      setBooks(loadBooks());
      setLogs(loadLogs());
    };
    sync();
    window.addEventListener("alexandria:data", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("alexandria:data", sync); window.removeEventListener("storage", sync); };
  }, []);

  const selectedId = sourceId ?? (books.some(book => book.id === bookId) ? bookId : books.find(book => !book.completed)?.id ?? books[0]?.id ?? "");
  const book = books.find(b => b.id === selectedId);
  const effectiveMode = book?.progressMode === "percentage" ? "percentage" : mode;
  const percentageMode = effectiveMode === "percentage";
  const effectiveWpm = Number(voiceWpm);
  useEffect(() => { setVoiceWpm(String(book?.voiceWpm ?? 150)); }, [selectedId, book?.voiceWpm]);
  useEffect(() => { setMethod(book?.progressMode === "percentage" ? "listening" : "reading"); setMode("current"); setValue(""); }, [selectedId, book?.progressMode]);
  const percentToday = logs.filter(log => log.bookId === selectedId && log.createdAt && londonDay(new Date(log.createdAt)) === londonDay()).reduce((sum, log) => sum + (log.progressPercent ?? (book && book.totalPages > 1 ? log.pages / book.totalPages * 100 : 0)), 0);
  const dailyMinutes = book ? estimateVoiceMinutes(book, 100 / 7, effectiveWpm) : undefined;
  const remainingMinutes = book ? estimateVoiceMinutes(book, 100 - bookPercent(book), effectiveWpm) : undefined;
  const scopedLogs = sourceId ? logs.filter(log => log.bookId === sourceId) : logs;
  const today = dayKey(new Date());
  const todaysLogs = scopedLogs.filter((log) => log.createdAt && londonDay(new Date(log.createdAt)) === today);
  const pagesToday = todaysLogs.reduce((sum, log) => sum + (log.pages ?? 0), 0);

  const last7 = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, index) => dayKey(new Date(Date.now() - index * 86400000)));
    return keys.map((key) => scopedLogs.filter((log) => log.createdAt && londonDay(new Date(log.createdAt)) === key).reduce((sum, log) => sum + (log.pages ?? 0), 0));
  }, [logs, sourceId]);
  const average7 = Math.round(last7.reduce((sum, pages) => sum + pages, 0) / 7);
  const highlightsToday = listHighlights().filter((item) => (!sourceId || item.sourceId === sourceId) && item.capturedAt && londonDay(new Date(item.capturedAt)) === today).length;
  const knowledgeRate = pagesToday > 0 ? Math.round((highlightsToday / pagesToday) * 10 * 10) / 10 : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const book = books.find((item) => item.id === selectedId);
    if (!book) return;
    try {
      const log = recordReadingSession({ bookId: book.id, mode: effectiveMode, voiceWpm: effectiveWpm, value: value ? Number(value) : undefined, minutes: Number(minutes) || 0, method, format, audioSpeed: Number(audioSpeed), listeningContext, comfortableSpeed: comfortableSpeed ? Number(comfortableSpeed) : undefined, trainingSpeed: trainingSpeed ? Number(trainingSpeed) : undefined });
      if (log.pages > 0 || (log.progressPercent ?? 0) > 0) awardPoints("reading-session", `Daily tally · ${log.progressPercent !== undefined ? `${log.progressPercent} percentage points` : `${log.pages} pages`} · ${book.title}`, POINTS.readingSession);
      setBooks(loadBooks()); setLogs(loadLogs()); setValue(""); setMinutes("");
      setMessage(log.progressPercent !== undefined ? `Recorded ${log.progressPercent} percentage points; now ${log.toPercent}% through ${book.title}.` : method === "listening" ? `Recorded ${log.minutes} listening minutes. Your reading page target is unchanged.` : `Recorded ${log.pages} pages in ${book.title}.`);
      window.dispatchEvent(new Event("alexandria:data"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this session."); }
  }

  return <article className="card reading-tally-card">
    <div className="kicker">Daily reading tally</div>
    <h2>{percentageMode ? "Log your book percentage." : sourceId ? "Log progress for this book." : "Close the day with your reading progress."}</h2>
    <p className="meta">Enter your current percentage or page. Alexandria records the increase since your last entry and keeps a dated history.</p>

    {book && <VoiceBookSetup key={book.id} book={book} />}
    <form className="reading-tally-form top-gap" onSubmit={submit}>
      {!sourceId && <label>Book
        <select value={selectedId} onChange={(event) => setBookId(event.target.value)}>
          {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
        </select>
      </label>}
      <label>Reading method<select value={method} onChange={event => setMethod(event.target.value as ReadingMethod)}><option value="reading">Reading</option><option value="listening">Listening only</option><option value="reading-listening">Reading while listening</option></select></label>
      {!percentageMode && method !== "listening" && <label>Book format<select value={format} onChange={event => setFormat(event.target.value as typeof format)}><option value="physical">Physical book</option><option value="kindle">Kindle</option><option value="pdf">PDF</option></select></label>}
      <label>Input type
        <select value={effectiveMode} onChange={(event) => { setMode(event.target.value as typeof mode); setValue(""); }}>
          {book?.progressMode !== "percentage" && <><option value="current">Current page</option><option value="pages">Pages read today</option></>}
          <option value="percentage">Current percentage (Voice Dream)</option>
        </select>
      </label>
      {(percentageMode || method !== "listening") && <label>{percentageMode ? "Percentage now" : mode === "current" ? "Page now" : "Pages read"}
        <input type="number" min="0" max={percentageMode ? 100 : undefined} step={percentageMode ? "any" : "1"} inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder={percentageMode ? "e.g. 28.6" : mode === "current" ? "e.g. 148" : "e.g. 24"} />
      </label>}
      <label>Actual session minutes {(percentageMode || method === "reading") && <span className="optional">optional</span>}
        <input type="number" min="0" step="any" inputMode="decimal" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="e.g. 35" />
      </label>
      {percentageMode && <label>Voice speed · words per minute<input required type="number" min="1" step="any" value={voiceWpm} onChange={event => setVoiceWpm(event.target.value)} /></label>}
      {!percentageMode && method !== "reading" && <><label>Audio speed<input type="number" min="0.1" step="0.1" value={audioSpeed} onChange={event => setAudioSpeed(event.target.value)} /></label><label>Listening opportunity<select value={listeningContext} onChange={event => setListeningContext(event.target.value)}>{["Focused session", "Walking / commute", "Exercise", "Chores / routine tasks", "Other"].map(context => <option key={context}>{context}</option>)}</select></label></>}
      {percentageMode && <label>Listening opportunity<select value={listeningContext} onChange={event => setListeningContext(event.target.value)}>{["Focused session", "In the car", "Walking / commute", "Exercise", "Chores / routine tasks", "Other"].map(context => <option key={context}>{context}</option>)}</select></label>}
      <button className="small-btn primary" type="submit" disabled={!selectedId || (percentageMode ? !value : method === "listening" ? !minutes : !value)}>Save session →</button>
      {!percentageMode && method !== "reading" && <details className="form-span"><summary>Audio training settings (optional)</summary><div className="form-grid top-gap"><label>Comfortable speed<input type="number" min="0.1" step="0.1" value={comfortableSpeed} onChange={event => setComfortableSpeed(event.target.value)} /></label><label>Training speed<input type="number" min="0.1" step="0.1" value={trainingSpeed} onChange={event => setTrainingSpeed(event.target.value)} /></label></div><p className="meta">Use recall to check understanding before increasing speed. Audio is played in your audiobook app.</p></details>}
    </form>

    {message && <p className="saved-note top-gap">{message}</p>}

    {percentageMode && book && <><div className="reading-tally-stats top-gap">
      <div><strong>{Number(bookPercent(book).toFixed(2))}%</strong><span>book completed</span></div>
      <div><strong>+{Number(percentToday.toFixed(2))}</strong><span>percentage points today</span></div>
      <div><strong>14.29</strong><span>percentage points / day (100 ÷ 7)</span></div>
      <div><strong>{dailyMinutes === undefined ? "—" : Math.ceil(dailyMinutes)}</strong><span>estimated minutes / day at {voiceWpm} WPM</span></div>
    </div><p className="meta top-gap">{remainingMinutes === undefined ? "Set the full-book duration above to estimate time." : `Estimated time remaining: ${Math.ceil(remainingMinutes)} minutes at ${voiceWpm} WPM.`} Time is an estimate based on the duration and reference WPM you entered; pauses and voice settings can change it. Percentage progress is your completion evidence. Log separate sessions when WPM changes.</p></>}
    {!percentageMode && <div className="reading-tally-stats top-gap">
      <div><strong>{pagesToday}</strong><span>pages today</span></div>
      <div><strong>{average7}</strong><span>7-day avg / day</span></div>
      <div><strong>{highlightsToday}</strong><span>knowledge captures today</span></div>
      <div><strong>{knowledgeRate}</strong><span>captures per 10 pages</span></div>
    </div>}

    <p className="meta top-gap">{percentageMode ? "Record the percentage actually reached in your reader. Slower speech changes the time needed, while the seven-day completion target stays fixed." : "Record the pages you actually read. Your book’s daily requirement is its total pages divided by seven."}</p>
  </article>;
}
