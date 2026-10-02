"use client";
import { useEffect, useState } from "react";
import { type StoredBook, loadLogs } from "@/lib/application-store";
import { configureVoiceBook } from "@/lib/reading-session-store";
import { bookPercent, listCommitments } from "@/lib/reading-execution";

export function VoiceBookSetup({ book }: { book: StoredBook }) {
  const [hours, setHours] = useState(book.voiceTotalMinutes ? String(Math.floor(book.voiceTotalMinutes / 60)) : "");
  const [minutes, setMinutes] = useState(book.voiceTotalMinutes ? String(book.voiceTotalMinutes % 60) : "0");
  const [wpm, setWpm] = useState(String(book.voiceReferenceWpm ?? 150));
  const [baseline, setBaseline] = useState(String(bookPercent(book)));
  const [message, setMessage] = useState("");
  useEffect(() => { setHours(book.voiceTotalMinutes ? String(Math.floor(book.voiceTotalMinutes / 60)) : ""); setMinutes(book.voiceTotalMinutes ? String(book.voiceTotalMinutes % 60) : "0"); setWpm(String(book.voiceReferenceWpm ?? 150)); setBaseline(String(bookPercent(book))); }, [book.id, book.voiceTotalMinutes, book.voiceReferenceWpm]);
  const locked = listCommitments().some(p => p.bookId === book.id) || loadLogs().some(l => l.bookId === book.id);
  return <details className="top-gap" open={!book.voiceTotalMinutes && book.totalPages <= 1}>
    <summary>{book.voiceTotalMinutes ? "Edit Voice Dream reading time" : "Set up Voice Dream percentage tracking"}</summary>
    <p className="meta top-gap">Enter the full book’s estimated duration and the WPM at which your reader displays it. Use total duration, not time remaining. No page count is needed.</p>
    <form className="form-grid top-gap" onSubmit={event => {
      event.preventDefault();
      try { configureVoiceBook(book.id, Number(hours) * 60 + Number(minutes), Number(wpm), locked ? undefined : Number(baseline)); setMessage("Voice settings saved. The seven-day target stays fixed."); }
      catch(error) { setMessage(error instanceof Error ? error.message : "Could not save voice settings."); }
    }}>
      <label>Full-book hours<input required type="number" min="0" step="1" value={hours} onChange={event => setHours(event.target.value)} /></label>
      <label>Additional minutes<input required type="number" min="0" max="59" step="any" value={minutes} onChange={event => setMinutes(event.target.value)} /></label>
      <label>WPM for this displayed duration<input required type="number" min="1" step="any" value={wpm} onChange={event => setWpm(event.target.value)} /></label>
      {!locked && <label>Starting percentage<input required type="number" min="0" max="99.99" step="any" value={baseline} onChange={event => setBaseline(event.target.value)} /></label>}
      <p className="meta form-span">Starting percentage is a baseline, not today’s reading credit. Each day requires about 14.29 percentage points. Session WPM can change; time estimates will adjust.</p>
      <button className="small-btn primary">{locked ? "Save voice settings" : "Begin seven-day voice tracking"} →</button>
    </form>
    {message && <p role="status" className="saved-note top-gap">{message}</p>}
  </details>;
}
