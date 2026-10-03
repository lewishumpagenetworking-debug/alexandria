"use client";

import { useEffect, useState } from "react";
import { createBook, loadBooks, loadLogs, saveBooks, setBookState, updateBookDetails, type StoredBook } from "@/lib/application-store";
import { bookPercent, startPercentageCommitment, restartPercentageCommitment, progressLabel, executionStatus, listCommitments, startCommitment, restartCommitment, stopCommitment, updateCommitmentTarget } from "@/lib/reading-execution";
import { addHighlight, getHighlightsForSource } from "@/lib/library-notes-store";
import { clearBookKnowledge, deleteBookHighlight } from "@/lib/book-note-removal";
import { registerCard } from "@/lib/retrieval-store";
import { ImportNotesWorkspace } from "@/components/import-notes-workspace";
import { DailyBookWorkflow } from "@/components/daily-book-workflow";
import { BookMetaPage } from "@/components/book-meta-page";

import { BOOK_CATEGORIES, type BookCategory } from "@/lib/book-categories";

type Shelf = "books" | "archive" | "trash";
const blank = () => ({ title: "", author: "", totalPages: "", currentPage: "0", category: "general" as BookCategory, progressMode: "pages" as "pages" | "percentage", currentPercent: "0", hours: "", durationMinutes: "0", wpm: "150" });

export function BookTallyWorkspace({ onBack, initiallyCreate = false, initialBookId = "" }: { onBack?: () => void; initiallyCreate?: boolean; initialBookId?: string } = {}) {
  const [books, setBooks] = useState(() => loadBooks({ includeArchived: true, includeDeleted: true }));
  const [selectedId, setSelectedId] = useState(initialBookId);
  const [shelf, setShelf] = useState<Shelf>("books");
  const [creating, setCreating] = useState(initiallyCreate);
  const [editing, setEditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const sync = () => { setBooks(loadBooks({ includeArchived: true, includeDeleted: true })); setRevision(value => value + 1); };
    sync(); window.addEventListener("alexandria:data", sync); window.addEventListener("storage", sync);
    const start = () => { setCreating(true); setEditing(false); setSelectedId(""); setForm(blank()); setMessage(""); };
    window.addEventListener("alexandria:start-book", start);
    const timer = window.setInterval(sync, 60000);
    return () => { window.removeEventListener("alexandria:start-book", start); clearInterval(timer); window.removeEventListener("alexandria:data", sync); window.removeEventListener("storage", sync); };
  }, []);
  const shown = books.filter(book => shelf === "trash" ? book.deletedAt : shelf === "archive" ? !book.deletedAt && book.archivedAt : !book.deletedAt && !book.archivedAt);
  const selected = shown.find(book => book.id === selectedId);
  const plans = listCommitments();
  const plan = selected ? plans.find(item => item.bookId === selected.id) : undefined;
  const logs = loadLogs();
  const status = selected && plan ? executionStatus(plan, selected, logs) : null;
  const notes = selected ? getHighlightsForSource(selected.id) : [];
  // revision refreshes note counts, page totals and commitment status after other views save.
  void revision;

  function newBook() { setCreating(true); setEditing(false); setSelectedId(""); setForm(blank()); setMessage(""); setDeleteId(""); }
  function openBook(book: StoredBook) { setSelectedId(book.id); setCreating(false); setEditing(false); setMessage(""); setDeleteId(""); setNote(""); setLocation(""); }
  function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const voiceTotalMinutes = form.hours.trim() || Number(form.durationMinutes) ? Number(form.hours) * 60 + Number(form.durationMinutes) : undefined;
      const tracking = { category: form.category, progressMode: form.progressMode, currentPercent: form.progressMode === "percentage" ? Number(form.currentPercent) : undefined, voiceTotalMinutes: form.progressMode === "percentage" ? voiceTotalMinutes : undefined, voiceReferenceWpm: form.progressMode === "percentage" ? Number(form.wpm) : undefined };
      if (editing && selected) {
        const nextTotal = form.totalPages.trim() ? Number(form.totalPages) : undefined;
        updateBookDetails(selected.id, { title: form.title, author: form.author, totalPages: nextTotal, ...tracking });
        if (plan && selected.progressMode !== "percentage" && nextTotal && Number.isInteger(nextTotal)) updateCommitmentTarget(selected.id, nextTotal);
      }
      else {
        const book = createBook({ title: form.title, author: form.author, totalPages: form.totalPages.trim() ? Number(form.totalPages) : undefined, currentPage: form.progressMode === "pages" ? Number(form.currentPage) : 0, ...tracking });
        setShelf("books"); setSelectedId(book.id);
      }
      setCreating(false); setEditing(false); setMessage(editing ? "Book saved. Its tracking format is applied below." : "Book folder created. Start reading and add notes as you go.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this book."); }
  }
  function removeOneSavedNote(noteId: string) {
    if (!selected || !window.confirm("Delete this saved note from the book? Its linked interpretation, book-specific principle, and review card will also be removed.")) return;
    const result = deleteBookHighlight(selected.id, noteId);
    setMessage(`Deleted ${result.highlightsRemoved} saved note and cleaned linked learning data.`);
  }
  function removeAllSavedNotes() {
    if (!selected) return;
    const confirmed = window.confirm(`Delete every note attached to "${selected.title}"?\n\nThis removes highlights, interpretations, principles, imported questions, and their review state. The book, reading progress, reading history, and commitment history stay intact.\n\nYou would need to re-import the notes to restore them.`);
    if (!confirmed) return;
    const result = clearBookKnowledge(selected.id);
    setMessage(`Deleted ${result.highlightsRemoved} highlights, ${result.interpretationsRemoved} interpretations, and ${result.principlesRemoved + result.principlesDetached} principle links from this book.`);
  }

  function changeState(action: "archive" | "unarchive" | "delete" | "restore") {
    if (!selected) return;
    setBookState(selected.id, action); setSelectedId(""); setDeleteId(""); setEditing(false);
    setMessage(action === "delete" ? "Moved to Trash. Restore it there to recover its tracking and notes." : action === "archive" ? "Book archived. Its tracking and notes are preserved." : "Book restored to its previous shelf.");
  }
  if (importing && selected) return <ImportNotesWorkspace initialSourceId={selected.id} onBack={() => setImporting(false)} onComplete={() => setImporting(false)} />;
  return <article className="card book-tally-workspace" id={onBack || initialBookId ? undefined : "reading-books"}>
    {onBack && <button className="action-link back" onClick={onBack}>← Back to Library</button>}
    <div className="card-head"><div><div className="kicker">Reading tally · My books</div><h2>Your books, in their own folders.</h2></div><button className="small-btn primary" onClick={newBook}>＋ Start Book</button></div>
    <p className="meta">Start with a title and choose physical pages or Voice Dream percentage tracking. Add reading sessions and notes as you read. Import existing notes later if you choose.</p>
    <div className="button-row top-gap" role="group" aria-label="Book shelves">
      {(["books", "archive", "trash"] as const).map(tab => <button key={tab} className={`small-btn${shelf === tab ? " primary" : ""}`} aria-pressed={shelf === tab} onClick={() => { setShelf(tab); setSelectedId(""); setCreating(false); setEditing(false); setDeleteId(""); setMessage(""); }}>{tab === "books" ? "My Books" : tab === "archive" ? "Archive" : "Trash"} ({books.filter(book => tab === "trash" ? book.deletedAt : tab === "archive" ? !book.deletedAt && book.archivedAt : !book.deletedAt && !book.archivedAt).length})</button>)}
    </div>
    {(creating || editing) && <form className="form-grid top-gap book-entry-form" onSubmit={save}>
      <label className="form-span">Enter a Book Title<input required autoFocus value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Napoleon: A Life" /></label>
      <label className="form-span">Book category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as BookCategory })}>{Object.entries(BOOK_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="form-span">Reading format<select value={form.progressMode} onChange={event => {
        const mode = event.target.value as "pages" | "percentage";
        setForm({ ...form, progressMode: mode, currentPercent: editing && selected ? String(bookPercent(selected)) : form.totalPages && Number(form.totalPages) > 1 ? String(Number(form.currentPage) / Number(form.totalPages) * 100) : form.currentPercent });
      }}><option value="pages">Physical book · pages</option><option value="percentage">Voice Dream · percentage (0–100%)</option></select></label>
      <label>Author <span className="optional">optional</span><input value={form.author} onChange={event => setForm({ ...form, author: event.target.value })} /></label>
      {form.progressMode === "percentage" ? <>
        <label>{editing ? "Saved percentage" : "Starting percentage"}<input required type="number" min="0" max={editing ? "100" : "99.99"} step="any" value={form.currentPercent} onChange={event => setForm({ ...form, currentPercent: event.target.value })} /></label>
        <label>Full-book hours <span className="optional">can be added later</span><input type="number" min="0" step="1" value={form.hours} onChange={event => setForm({ ...form, hours: event.target.value })} /></label>
        <label>Additional minutes<input type="number" min="0" max="59" step="any" value={form.durationMinutes} onChange={event => setForm({ ...form, durationMinutes: event.target.value })} /></label>
        <label>WPM for this displayed duration<input required type="number" min="1" step="any" value={form.wpm} onChange={event => setForm({ ...form, wpm: event.target.value })} /></label>
        <p className="meta form-span">Voice Dream format: 0% → 100%. Daily requirement: 100 ÷ 7 ≈ 14.29 percentage points. Enter the full-book duration displayed at this WPM, not time remaining. Changing session WPM adjusts estimated time, while the percentage target stays fixed. Starting progress is a baseline, not a reading session.</p>
      </> : <>
        <label>Total pages <span className="optional">can be corrected anytime</span><input type="number" min="2" step="1" value={form.totalPages} onChange={event => setForm({ ...form, totalPages: event.target.value })} /></label>
        {!editing && <label>Starting page<input type="number" min="0" max={form.totalPages ? Math.max(0, Number(form.totalPages) - 1) : 0} step="1" value={form.currentPage} onChange={event => setForm({ ...form, currentPage: event.target.value })} /></label>}
        <p className="meta form-span">{Number(form.totalPages) > 1 ? `${form.totalPages} ÷ 7 = ${Number((Number(form.totalPages) / 7).toFixed(2))} pages per day.` : "Add the page count when you are ready to set the seven-day target."} Starting progress is a baseline. Log reading below to update your progress.</p>
      </>}
      <div className="button-row form-span"><button className="small-btn primary">{editing ? "Save Book" : "Start Book"}</button><button type="button" className="small-btn" onClick={() => { setCreating(false); setEditing(false); setMessage(""); }}>Cancel</button></div>
    </form>}
    {message && <p className="saved-note top-gap" role="status">{message}</p>}
    {!creating && !selected && <div className="book-folder-grid top-gap">
      {shown.map(book => <button className="book-folder" key={book.id} onClick={() => openBook(book)}><span className="folder-mark" aria-hidden="true">▤</span><strong>{book.title}</strong><span>{book.author}</span><span>{BOOK_CATEGORIES[book.category ?? "general"]} · {progressLabel(book)} · {getHighlightsForSource(book.id).length} notes</span><span>{book.completed ? "Reading completed" : "In progress"}</span></button>)}
      {shown.length === 0 && <p className="meta">{shelf === "books" ? "No books here yet. Choose Start Book and enter a title to create your first tracking folder." : shelf === "archive" ? "Archived books appear here with their history and notes." : "Deleted books appear here. You can restore them without losing their work."}</p>}
    </div>}
    {!creating && selected && <section className="book-folder-detail top-gap" aria-label={`${selected.title} tracking folder`}>
      <button className="action-link" onClick={() => { setSelectedId(""); setEditing(false); setDeleteId(""); setMessage(""); }}>← All book folders</button>
      <h3 className="top-gap">{selected.title}</h3><p className="meta">{selected.author} · {BOOK_CATEGORIES[selected.category ?? "general"]} · {selected.progressMode === "percentage" ? progressLabel(selected) : selected.totalPages > 1 ? `${selected.currentPage} / ${selected.totalPages} pages` : "Choose pages or percentage tracking below"}</p>
      <div className="button-row top-gap">
        {!selected.deletedAt && <button className="small-btn" onClick={() => { setEditing(true); setForm({ ...blank(), category: selected.category ?? "general", title: selected.title, author: selected.author, totalPages: selected.totalPages > 1 ? String(selected.totalPages) : "", currentPage: String(selected.currentPage), progressMode: selected.progressMode ?? "pages", currentPercent: String(bookPercent(selected)), hours: selected.voiceTotalMinutes ? String(Math.floor(selected.voiceTotalMinutes / 60)) : "", durationMinutes: selected.voiceTotalMinutes ? String(selected.voiceTotalMinutes % 60) : "0", wpm: String(selected.voiceReferenceWpm ?? 150) }); }}>Edit Book</button>}
        {selected.deletedAt ? <button className="small-btn primary" onClick={() => changeState("restore")}>Restore Book</button> : <><button className="small-btn" onClick={() => changeState(selected.archivedAt ? "unarchive" : "archive")}>{selected.archivedAt ? "Unarchive Book" : "Archive Book"}</button><button className="small-btn danger-outline-btn" disabled={notes.length === 0 && selected.highlights.length === 0 && selected.principles === 0} onClick={removeAllSavedNotes}>Delete book notes</button><button className="small-btn" onClick={() => setDeleteId(selected.id)}>Delete Book</button></>}
      </div>
      {deleteId === selected.id && <div className="card top-gap" role="alert"><p>Move “{selected.title}” to Trash? Its page history, notes and breakdown will remain recoverable.</p><div className="button-row"><button className="small-btn primary" onClick={() => changeState("delete")}>Move to Trash</button><button className="small-btn" onClick={() => setDeleteId("")}>Keep Book</button></div></div>}
      <p className="meta top-gap">Daily target for this book: {selected.progressMode === "percentage" ? "14.29 percentage points (100 ÷ 7)" : selected.totalPages > 1 ? `${Number((selected.totalPages / 7).toFixed(2))} pages (${selected.totalPages} ÷ 7)` : "Set up pages or percentage tracking below"}. This is guidance, not a lock on other books.</p>
      {status && <p className="saved-note">Day {status.day} / 7 · reach {Number(status.pageTarget.toFixed(2))}{plan?.unit === "percentage" ? "%" : " pages"} · deadline {status.deadline} · {status.finished ? "Reading finished" : status.overdue ? "Deadline missed" : `${Number(status.remainingToday.toFixed(2))} ${plan?.unit === "percentage" ? "percentage points" : "pages"} still required today`}</p>}
      {selected.archivedAt || selected.deletedAt ? <p className="meta">Restore this book to resume logging. Existing commitments keep their original deadline.</p> : <>
        {!selected.completed && !plan && <button className="small-btn primary top-gap" onClick={() => {
          if (selected.progressMode !== "percentage" && selected.totalPages <= 1) { setMessage("Edit Book to enter the actual total pages before starting."); return; }
          try { if (selected.progressMode === "percentage") startPercentageCommitment(selected.id, bookPercent(selected)); else startCommitment(selected.id, selected.totalPages); setMessage("Seven-day target started. Other books can be tracked at the same time."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start the commitment."); }
        }}>Begin seven-day target →</button>}
        {!selected.completed && plan && <div className="button-row top-gap">
          <button className="small-btn" onClick={() => {
            if (!window.confirm("Restart this book’s seven-day target from today? Existing reading logs stay intact; the target start date resets.")) return;
            if (selected.progressMode === "percentage") restartPercentageCommitment(selected.id, bookPercent(selected)); else restartCommitment(selected.id, selected.totalPages);
            setMessage("Seven-day target restarted from today.");
          }}>Restart 7-day target</button>
          <button className="small-btn" onClick={() => {
            if (!window.confirm("Stop weekly tracking for this book? The book, notes, progress, and reading logs stay intact.")) return;
            stopCommitment(selected.id);
            setMessage("Weekly tracking stopped for this book. You can start another target whenever you want.");
          }}>Stop weekly tracking</button>
        </div>}
        <div className="top-gap"><DailyBookWorkflow key={selected.id} sourceId={selected.id} /></div>
        <details className="top-gap"><summary>Add another quote or note (optional)</summary><form className="form-grid top-gap" onSubmit={event => {
          event.preventDefault(); if (!note.trim()) return;
          const highlight = addHighlight({ sourceId: selected.id, text: note.trim(), location: location.trim() || undefined });
          registerCard("highlight", highlight.id, selected.title, highlight.text);
          saveBooks(loadBooks().map(book => book.id === selected.id ? { ...book, highlights: [...book.highlights, highlight.text] } : book));
          setNote(""); setLocation(""); setMessage("Note saved to this book and available for quote study."); window.dispatchEvent(new Event("alexandria:data"));
        }}><label className="form-span">Add a quote or note<textarea required value={note} onChange={event => setNote(event.target.value)} /></label><label>Page / chapter <span className="optional">optional</span><input value={location} onChange={event => setLocation(event.target.value)} /></label><div className="form-span"><button className="small-btn" disabled={!note.trim()}>Save Note</button></div></form></details>
      </>}
      {!selected.deletedAt && !selected.archivedAt && <details className="top-gap"><summary>Import existing notes later (optional)</summary><p className="meta">Your folder and reading tracker work without an import. When you have notes to upload, you can add them to this book here.</p><button className="small-btn" onClick={() => setImporting(true)}>Import notes into this book</button></details>}
      <details className="top-gap"><summary>Reading history ({logs.filter(log => log.bookId === selected.id).length} sessions)</summary>{logs.filter(log => log.bookId === selected.id).map(log => <p className="meta" key={log.id}>{log.date} · {log.progressPercent !== undefined ? `+${log.progressPercent} percentage points (${log.fromPercent}% → ${log.toPercent}%)` : `${log.pages} pages`} · {log.minutes} minutes{log.method ? ` · ${log.method}` : ""}{log.voiceWpm ? ` · ${log.voiceWpm} WPM` : ""}{log.estimatedMinutes !== undefined ? ` · estimated ${Math.ceil(log.estimatedMinutes)} minutes` : ""}{log.audioSpeed ? ` · ${log.audioSpeed}× audio` : ""}</p>)}</details>
      <details className="top-gap" open={notes.length > 0}><summary>Saved notes ({notes.length}) · manage / delete</summary>
        <div className="book-note-admin top-gap">
          <div><strong>Manage saved notes</strong><p className="meta">Delete one note below, or clear the entire book’s imported knowledge. Reading progress and reading history are preserved.</p></div>
          <button className="danger-btn" disabled={notes.length === 0 && selected.highlights.length === 0 && selected.principles === 0} onClick={removeAllSavedNotes}>Delete all notes from this book</button>
        </div>
        {notes.length === 0 && <p className="meta top-gap">{selected.highlights.length > 0 || selected.principles > 0 ? "Older note data is attached to this book. Use the delete-all button above to clear it." : "No saved notes are attached to this book."}</p>}
        {notes.map(item => <div className="note-item managed-note-item" key={item.id}><div className="card-head"><span className="kicker">{item.location || "Note"}</span><button className="danger-link-btn" onClick={() => removeOneSavedNote(item.id)}>Delete note</button></div><p>{item.text}</p></div>)}
      </details>
      {!selected.deletedAt && <BookMetaPage key={selected.id} book={selected} />}
    </section>}
  </article>;
}
