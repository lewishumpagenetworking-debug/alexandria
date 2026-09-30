"use client";

import { useEffect, useState } from "react";
import { createBook, loadBooks, loadLogs, saveBooks, setBookState, updateBookDetails, type StoredBook } from "@/lib/application-store";
import { progressLabel, executionStatus, listCommitments, startCommitment } from "@/lib/reading-execution";
import { addHighlight, getHighlightsForSource } from "@/lib/library-notes-store";
import { registerCard } from "@/lib/retrieval-store";
import { ImportNotesWorkspace } from "@/components/import-notes-workspace";
import { DailyBookWorkflow } from "@/components/daily-book-workflow";
import { BookMetaPage } from "@/components/book-meta-page";

type Shelf = "books" | "archive" | "trash";
const blank = () => ({ title: "", author: "", totalPages: "", currentPage: "0" });

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
      if (editing && selected) updateBookDetails(selected.id, { title: form.title, author: form.author, totalPages: form.totalPages.trim() ? Number(form.totalPages) : undefined });
      else {
        const book = createBook({ title: form.title, author: form.author, totalPages: form.totalPages.trim() ? Number(form.totalPages) : undefined, currentPage: Number(form.currentPage) });
        setShelf("books"); setSelectedId(book.id);
      }
      setCreating(false); setEditing(false); setMessage("Book folder created. Start reading and add notes as you go.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this book."); }
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
    <p className="meta">Start with a title to create the folder. Add your page count, reading sessions and notes as you read. Import existing notes later if you choose.</p>
    <div className="button-row top-gap" role="group" aria-label="Book shelves">
      {(["books", "archive", "trash"] as const).map(tab => <button key={tab} className={`small-btn${shelf === tab ? " primary" : ""}`} aria-pressed={shelf === tab} onClick={() => { setShelf(tab); setSelectedId(""); setCreating(false); setEditing(false); setDeleteId(""); setMessage(""); }}>{tab === "books" ? "My Books" : tab === "archive" ? "Archive" : "Trash"} ({books.filter(book => tab === "trash" ? book.deletedAt : tab === "archive" ? !book.deletedAt && book.archivedAt : !book.deletedAt && !book.archivedAt).length})</button>)}
    </div>
    {(creating || editing) && <form className="form-grid top-gap book-entry-form" onSubmit={save}>
      <label className="form-span">Enter a Book Title<input required autoFocus value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Napoleon: A Life" /></label>
      <details className="form-span"><summary>{editing ? "Book details" : "Add details now (optional)"}</summary><div className="form-grid top-gap">
      <label>Author <span className="optional">optional</span><input value={form.author} onChange={event => setForm({ ...form, author: event.target.value })} /></label>
      <label>Total pages <span className="optional">can be added later</span><input type="number" min="2" step="1" disabled={editing && !!plan} value={form.totalPages} onChange={event => setForm({ ...form, totalPages: event.target.value })} /></label>
      {!editing && <label>Starting page<input type="number" min="0" max={form.totalPages ? Math.max(0, Number(form.totalPages) - 1) : 0} step="1" value={form.currentPage} onChange={event => setForm({ ...form, currentPage: event.target.value })} /></label>}
      <p className="meta form-span">{Number(form.totalPages) > 1 ? `${form.totalPages} ÷ 7 = ${Number((Number(form.totalPages) / 7).toFixed(2))} pages per day.` : "Add the page count when you are ready to set the seven-day target."} {editing && plan ? "Total pages are locked by the seven-day commitment." : !editing ? "The starting page is a baseline; it does not create a reading session." : "Log reading below to update your current page."}</p>
      </div></details>
      <div className="button-row form-span"><button className="small-btn primary">{editing ? "Save Book" : "Start Book"}</button><button type="button" className="small-btn" onClick={() => { setCreating(false); setEditing(false); setMessage(""); }}>Cancel</button></div>
    </form>}
    {message && <p className="saved-note top-gap" role="status">{message}</p>}
    {!creating && !selected && <div className="book-folder-grid top-gap">
      {shown.map(book => <button className="book-folder" key={book.id} onClick={() => openBook(book)}><span className="folder-mark" aria-hidden="true">▤</span><strong>{book.title}</strong><span>{book.author}</span><span>{progressLabel(book)} · {getHighlightsForSource(book.id).length} notes</span><span>{book.completed ? "Reading completed" : "In progress"}</span></button>)}
      {shown.length === 0 && <p className="meta">{shelf === "books" ? "No books here yet. Choose Start Book and enter a title to create your first tracking folder." : shelf === "archive" ? "Archived books appear here with their history and notes." : "Deleted books appear here. You can restore them without losing their work."}</p>}
    </div>}
    {!creating && selected && <section className="book-folder-detail top-gap" aria-label={`${selected.title} tracking folder`}>
      <button className="action-link" onClick={() => { setSelectedId(""); setEditing(false); setDeleteId(""); setMessage(""); }}>← All book folders</button>
      <h3 className="top-gap">{selected.title}</h3><p className="meta">{selected.author} · {selected.progressMode === "percentage" ? progressLabel(selected) : selected.totalPages > 1 ? `${selected.currentPage} / ${selected.totalPages} pages` : "Choose pages or percentage tracking below"}</p>
      <div className="button-row top-gap">
        {!selected.deletedAt && <button className="small-btn" onClick={() => { setEditing(true); setForm({ title: selected.title, author: selected.author, totalPages: selected.totalPages > 1 ? String(selected.totalPages) : "", currentPage: String(selected.currentPage) }); }}>Edit Book</button>}
        {selected.deletedAt ? <button className="small-btn primary" onClick={() => changeState("restore")}>Restore Book</button> : <><button className="small-btn" onClick={() => changeState(selected.archivedAt ? "unarchive" : "archive")}>{selected.archivedAt ? "Unarchive Book" : "Archive Book"}</button><button className="small-btn" onClick={() => setDeleteId(selected.id)}>Delete Book</button></>}
      </div>
      {deleteId === selected.id && <div className="card top-gap" role="alert"><p>Move “{selected.title}” to Trash? Its page history, notes and breakdown will remain recoverable.</p><div className="button-row"><button className="small-btn primary" onClick={() => changeState("delete")}>Move to Trash</button><button className="small-btn" onClick={() => setDeleteId("")}>Keep Book</button></div></div>}
      <p className="meta top-gap">Daily requirement: {selected.progressMode === "percentage" ? "14.29 percentage points (100 ÷ 7)" : selected.totalPages > 1 ? `${Number((selected.totalPages / 7).toFixed(2))} pages (${selected.totalPages} ÷ 7)` : "Set up pages or percentage tracking below"}.</p>
      {status && <p className="saved-note">Day {status.day} / 7 · reach {Number(status.pageTarget.toFixed(2))}{plan?.unit === "percentage" ? "%" : " pages"} · deadline {status.deadline} · {status.finished ? "Reading finished" : status.overdue ? "Deadline missed" : `${Number(status.remainingToday.toFixed(2))} ${plan?.unit === "percentage" ? "percentage points" : "pages"} still required today`}</p>}
      {selected.archivedAt || selected.deletedAt ? <p className="meta">Restore this book to resume logging. Existing commitments keep their original deadline.</p> : <>
        {!plan && !selected.completed && <button className="small-btn primary top-gap" onClick={() => {
          const unfinished = plans.find(item => { const book = books.find(b => b.id === item.bookId); return book && !book.completed; });
          if (selected.totalPages <= 1) { setMessage("Edit Book to enter the actual total pages before starting."); return; }
          if (unfinished) { setMessage("Finish your existing seven-day commitment first. Restore its book if it is archived or in Trash."); return; }
          try { startCommitment(selected.id, selected.totalPages); setMessage("Seven-day commitment started today."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start the commitment."); }
        }}>Begin seven-day commitment →</button>}
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
      <details className="top-gap"><summary>Saved notes ({notes.length})</summary>{notes.map(item => <div className="note-item" key={item.id}><span className="kicker">{item.location || "Note"}</span><p>{item.text}</p></div>)}</details>
      {!selected.deletedAt && <BookMetaPage key={selected.id} book={selected} />}
    </section>}
  </article>;
}
