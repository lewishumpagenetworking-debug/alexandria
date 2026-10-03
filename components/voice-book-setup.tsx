"use client";
import { useEffect, useState } from "react";
import { type StoredBook } from "@/lib/application-store";
import { configureVoiceBook } from "@/lib/reading-session-store";
import { bookPercent } from "@/lib/reading-execution";

export function VoiceBookSetup({ book }: { book: StoredBook }) {
  const [hours, setHours] = useState(book.voiceTotalMinutes ? String(Math.floor(book.voiceTotalMinutes / 60)) : "");
  const [minutes, setMinutes] = useState(book.voiceTotalMinutes ? String(book.voiceTotalMinutes % 60) : "0");
  const [wpm, setWpm] = useState(String(book.voiceReferenceWpm ?? 150));
  const [baseline, setBaseline] = useState(String(bookPercent(book)));
  const [message, setMessage] = useState("");
  useEffect(() => { setHours(book.voiceTotalMinutes ? String(Math.floor(book.voiceTotalMinutes / 60)) : ""); setMinutes(book.voiceTotalMinutes ? String(book.voiceTotalMinutes % 60) : "0"); setWpm(String(book.voiceReferenceWpm ?? 150)); setBaseline(String(bookPercent(book))); }, [book.id, book.voiceTotalMinutes, book.voiceReferenceWpm]);
  return <details className="top-gap" open={!book.voiceTotalMinutes && book.totalPages <= 1}>
    <summary>{book.voiceTotalMinutes ? "Edit Voice Dream reading time" : "Set up Voice Dream percentage tracking"}</summary>
    <p className="meta top-gap">Enter the full book’s estimated duration and the WPM at which your reader displays it. Use total duration, not time remaining. No page count is needed.</p>
    <form className="form-grid top-gap" onSubmit={event => {
      event.preventDefault();
      try { configureVoiceBook(book.id, Number(hours) * 60 + Number(minutes), Number(wpm), Number(baseline)); setMessage("Voice settings and saved baseline updated. Existing reading logs remain intact."); }
      catch(error) { setMessage(error instanceof Error ? error.message : "Could not save voice settings."); }
    }}>
      <label>Full-book hours<input required type="number" min="0" step="1" value={hours} onChange={event => setHours(event.target.value)} /></label>
      <label>Additional minutes<input required type="number" min="0" max="59" step="any" value={minutes} onChange={event => setMinutes(event.target.value)} /></label>
      <label>WPM for this displayed duration<input required type="number" min="1" step="any" value={wpm} onChange={event => setWpm(event.target.value)} /></label>
      <label>Saved percentage / correction<input required type="number" min="0" max="100" step="any" value={baseline} onChange={event => setBaseline(event.target.value)} /></label>
      <p className="meta form-span">This percentage is your saved baseline and can be corrected at any time. Corrections are not counted as today’s reading credit. Session WPM can change; time estimates will adjust.</p>
      <button className="small-btn primary">Save Voice Dream settings →</button>
    </form>
    {message && <p role="status" className="saved-note top-gap">{message}</p>}
  </details>;
}
