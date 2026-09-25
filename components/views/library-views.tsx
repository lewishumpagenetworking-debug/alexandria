"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { capabilityEvidence, halls } from "@/data/mock-data";
import { loadBooks, loadLogs, saveBooks, saveLogs, seedBooks, uid, type ReadingLog, type StoredBook } from "@/lib/application-store";
import { addHighlight, getHighlightsForSource, getPrinciplesForHall, getPrinciplesForSource } from "@/lib/library-notes-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import { recordSessionResult, type StepResult } from "@/lib/path-store";
import { registerCard } from "@/lib/retrieval-store";
import { commitRows, createNotesTemplate, downloadBlob, xlsxImporter, type ImportSummary } from "@/services/import/xlsx-importer";
import type { ImportPreview, ImportRow } from "@/services/import/spreadsheet-import";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";
import { AgoraView, FirstPrinciplesView, ForumView, InterrogationView } from "@/components/views/academy-views";
import { PageHeader, Rule } from "@/components/page-header";

const maturity = ["Collected", "Understood", "Interrogated", "Reduced", "Rebuilt", "Applied", "Tested", "Integrated"];

function Maturity({ value = 3 }: { value?: number }) {
  return <div className="maturity" aria-label={`Knowledge maturity: ${maturity[value]}`}>{maturity.map((label, index) => <div className={index <= value ? "reached" : ""} key={label}><i /> <span>{label}</span></div>)}</div>;
}

export function AtriumView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [question, setQuestion] = useState("");
  const [showCounsel, setShowCounsel] = useState(false);
  return <section className="view active">
    <div className="hero"><div className="seeker"><div className="eyebrow">The Atrium · Daily inquiry</div><h1>What are you seeking?</h1><p>Bring a decision, an uncertainty, or a question worth living with.</p>
      <form className="seek-box" onSubmit={(event) => { event.preventDefault(); if (question.trim()) setShowCounsel(true); }}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Your question" placeholder="What assumptions am I making about this decision?" /><button>Enter the Library</button></form>
      <div className="seek-hints">Try: “What have I learned about uncertainty?” or “What historical situations resemble this?”</div>
      {showCounsel && <div className="counsel show"><strong>Before searching for an answer, clarify the decision.</strong><p>Begin with your current belief, the evidence beneath it, and what would change your mind. Related principles are waiting in Logic & Systems and Strategy & Power.</p></div>}
    </div></div>
    <div className="content"><div className="atrium-grid"><div className="stack">
      <article className="card"><div className="card-head"><div><div className="kicker">Continue reading</div><h2>The Beginning of Infinity</h2></div><button className="ghost-btn" onClick={() => navigate("ledger")}>Open ledger</button></div><div className="book-row"><div className="book-cover">THE BEGINNING OF INFINITY</div><div><p className="meta">David Deutsch · Chapter 9 of 18</p><p>“Optimism” — explanations, error correction, and the reach of progress.</p><div className="progress"><span /></div><div className="meta">218 of 341 pages · 24 pages this week · 28 highlights · 7 principles</div><button className="action-link" onClick={() => navigate("ledger")}>Continue at page 219 →</button></div></div></article>
      <article className="card"><div className="card-head"><div><div className="kicker">Awaiting interrogation · 4</div><h2>Ideas that have not earned their place yet</h2></div><button className="ghost-btn" onClick={() => navigate("interrogation")}>Begin interrogation</button></div><div className="list"><div className="list-item"><strong>“The opposite of a good idea can also be a good idea.”</strong><span>The Art of Contrary Thinking · yesterday</span></div><div className="list-item"><strong>Institutions remember what individuals forget.</strong><span>Personal observation · 3 days ago</span></div></div></article>
      <article className="card"><div className="kicker">Recently integrated</div><h2>Principles surviving contact with reality</h2><div className="list top-gap"><div className="list-item"><strong>Preserve optionality until information becomes decision-relevant.</strong><span>Applied 3 times · revised after pricing experiment</span></div><div className="list-item"><strong>Incentives reveal the actual system.</strong><span>Connected across Human Nature and Commerce & Creation</span></div></div></article>
    </div><div className="stack">
      <article className="card"><div className="kicker">Return to the Agora</div><h2>A trusted colleague challenges your strategy in public.</h2><p className="meta">Leadership · 2-minute response · paused</p><button className="small-btn primary" onClick={() => navigate("agora")}>Resume exercise</button></article>
      <article className="card"><div className="kicker">Enter the Forum</div><h2>Explain sunk costs to a founder who has spent three years building.</h2><p className="meta">Audience: intelligent non-expert · 60 seconds</p><button className="action-link" onClick={() => navigate("forum")}>Begin speaking →</button></article>
      <article className="card"><div className="kicker">Questions worth pursuing</div><div className="list"><div className="list-item"><strong>When does persistence become identity protection?</strong><span>From work · 2 connections</span></div><div className="list-item"><strong>Which beliefs depend on stable institutions?</strong><span>Strategy & Power · unresolved</span></div><div className="list-item"><strong>What is lost when every decision becomes measurable?</strong><span>The Examined Life · unresolved</span></div></div></article>
      <article className="card metric-card"><div className="kicker">The Library grows</div><div className="stat-row"><div className="stat"><b>11</b><span>sources</span></div><div className="stat"><b>86</b><span>highlights</span></div><div className="stat"><b>29</b><span>principles</span></div><div className="stat"><b>14</b><span>applied</span></div></div></article>
    </div></div></div>
  </section>;
}

type StudyPhase = "idle" | "interrogate" | "reduce" | "agora" | "forum" | "done";
const STUDY_NEXT: Record<StudyPhase, StudyPhase> = { idle: "idle", interrogate: "reduce", reduce: "agora", agora: "forum", forum: "done", done: "done" };

export function LibraryView() {
  const [books, setBooks] = useState(seedBooks);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StoredBook | null>(null);
  const [studyPhase, setStudyPhase] = useState<StudyPhase>("idle");
  const [studyPoints, setStudyPoints] = useState(0);
  const [studyBests, setStudyBests] = useState<string[]>([]);
  const [manageLibrary, setManageLibrary] = useState(false);
  useEffect(() => setBooks(loadBooks()), []);
  const shown = books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase()));

  function startStudy() { setStudyPhase("interrogate"); setStudyPoints(0); setStudyBests([]); }

  if (manageLibrary) return <div><div className="content"><button className="action-link back" onClick={() => { setManageLibrary(false); setBooks(loadBooks()); }}>← Back to Library</button></div><LedgerView /></div>;

  function advanceStudy(result: Exclude<StepResult, { exerciseType: "recall-check" }>, label: string) {
    if (!selected) return;
    const outcome = recordSessionResult(result, `${label} · ${selected.title}`);
    setStudyPoints((points) => points + outcome.pointsAwarded.reduce((sum, event) => sum + event.points, 0));
    if (outcome.newBests.length) setStudyBests((bests) => [...bests, ...outcome.newBests.map((best) => best.label)]);
    setStudyPhase((phase) => STUDY_NEXT[phase]);
  }

  if (selected) {
    const bookHighlights = getHighlightsForSource(selected.id);
    const bookPrinciples = getPrinciplesForSource(selected.id);
    const canStudy = bookHighlights.length > 0 || bookPrinciples.length > 0;
    const passage = bookHighlights[0]
      ? { text: bookHighlights[0].text, source: selected.title }
      : bookPrinciples[0] ? { text: bookPrinciples[0].statement, source: selected.title } : undefined;

    if (studyPhase !== "idle") return <section className="view active"><div className="content">
      <button className="action-link back" onClick={() => setStudyPhase("idle")}>← Exit study session</button>
      {studyPhase === "interrogate" && <InterrogationView key="study-interrogate" passage={passage} onComplete={(result) => advanceStudy(result, "Interrogate")} />}
      {studyPhase === "reduce" && <FirstPrinciplesView key="study-reduce" stage="reduce" onComplete={(result) => advanceStudy(result, "Reduce")} />}
      {studyPhase === "agora" && <AgoraView key="study-agora" onComplete={(result) => advanceStudy(result, "Connect")} />}
      {studyPhase === "forum" && <ForumView key="study-forum" onComplete={(result) => advanceStudy(result, "Articulate")} />}
      {studyPhase === "done" && <article className="card completion study-loop-card"><div className="seal">✓</div><div><div className="kicker">Study session complete</div><h2>{selected.title}</h2><p className="meta">{studyPoints} points earned{studyBests.length ? ` · New record${studyBests.length > 1 ? "s" : ""}: ${studyBests.join(", ")}` : ""}.</p><button className="small-btn primary" onClick={() => setStudyPhase("idle")}>Return to {selected.title}</button></div></article>}
    </div></section>;

    return <section className="view active"><div className="content">
      <button className="action-link back" onClick={() => setSelected(null)}>← Return to the Library</button>
      <div className="source-hero"><div className="folio-cover">{selected.title}</div><div><div className="eyebrow">Source · Book</div><h1 className="page-title">{selected.title}</h1><p className="page-intro">{selected.author} · {selected.currentPage} of {selected.totalPages} pages · {bookHighlights.length} highlights · {bookPrinciples.length} principles</p><div className="progress"><span style={{ width: `${Math.round(selected.currentPage / selected.totalPages * 100)}%` }} /></div></div></div>
      <Maturity value={selected.completed ? 7 : 3} />
      <div className="button-row top-gap">
        <button className="small-btn primary" disabled={!canStudy} onClick={startStudy}>▶ Study this book</button>
        <button className="small-btn" onClick={() => setManageLibrary(true)}>⇪ Add / import notes</button>
        {!canStudy && <span className="voice-note">Add or import notes first so Alexandria has material to test.</span>}
      </div>
      <Rule />
      <div className="notes-list">
        {bookHighlights.length === 0 && bookPrinciples.length === 0 && <div className="empty"><strong>No notes yet.</strong><span>Import a filled Alexandria spreadsheet or add notes manually.</span><div className="top-gap"><button className="small-btn primary" onClick={() => setManageLibrary(true)}>Add / import notes</button></div></div>}
        {bookHighlights.map((highlight) => <div className="note-item" key={highlight.id}><div className="kicker">Highlight{highlight.location ? ` · ${highlight.location}` : ""}</div><p>{highlight.text}</p></div>)}
        {bookPrinciples.map((principle) => <div className="note-item" key={principle.id}><div className="kicker">Principle</div><p>{principle.statement}</p></div>)}
      </div>
    </div></section>;
  }

  return <section className="view active"><div className="content"><PageHeader eyebrow="The external memory" title="The Library" intro="Sources are beginnings, not trophies. Follow an idea from encounter through challenge, application, and revision." />
    <div className="section-tools"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, authors, principles…" aria-label="Search library" /><button className="small-btn primary" onClick={() => setManageLibrary(true)}>＋ Add book / import notes</button><span className="result-count">{shown.length} sources found</span></div>
    <div className="source-grid library-shelves">{shown.map((book, index) => <button className="book-card" onClick={() => setSelected(book)} key={book.id}><div className={`folio-cover tone-${index % 4}`}>{book.title}</div><div><span className="type">Book · {book.author}</span><h3>{book.title}</h3><p>{book.currentPage} / {book.totalPages} pages · {getHighlightsForSource(book.id).length} highlights · {getPrinciplesForSource(book.id).length} principles</p><div className="progress"><span style={{ width: `${Math.round(book.currentPage / book.totalPages * 100)}%` }} /></div></div></button>)}</div>
  </div></section>;
}

export function HallsView() {
  const [selected, setSelected] = useState<(typeof halls)[number] | null>(null);
  const books = loadBooks();
  const activeHalls = halls.filter((hall) => getPrinciplesForHall(hall.id).length > 0);
  const hallPrinciples = selected ? getPrinciplesForHall(selected.id) : [];
  const bookTitle = (sourceId: string) => books.find((book) => book.id === sourceId)?.title;

  return <section className="view active"><div className="content"><PageHeader eyebrow="Connected disciplines" title="Knowledge Map" intro="This area is built from your own imported and diagnosed material. Alexandria does not invent knowledge-map content for you." />
    {activeHalls.length === 0 ? <div className="empty"><strong>Your Knowledge Map is empty.</strong><span>Import notes from a real book, then tag or derive principles during study. Halls appear only when your own material earns a place in them.</span></div> :
    selected ? <>
      <button className="action-link back" onClick={() => setSelected(null)}>← Return to Knowledge Map</button>
      <article className="hall-detail" data-roman={selected.roman}><div className="eyebrow">Hall {selected.roman}</div><h2>{selected.title}</h2><p>{selected.description}</p><div className="hall-ledger"><div><b>{hallPrinciples.length}</b><span>your principles tagged here</span></div><div><b>{new Set(hallPrinciples.flatMap((p) => p.sourceIds)).size}</b><span>your contributing sources</span></div></div></article>
      <div className="notes-list">{hallPrinciples.map((principle) => <div className="note-item" key={principle.id}><div className="kicker">{principle.sourceIds.map(bookTitle).filter(Boolean).join(" · ") || "Your source"}</div><p>{principle.statement}</p></div>)}</div>
    </> : <div className="hall-grid">{activeHalls.map((hall) => <button className="card hall" data-roman={hall.roman} key={hall.id} onClick={() => setSelected(hall)}><div className="count">{getPrinciplesForHall(hall.id).length} principles</div><h3>{hall.title}</h3><p>{hall.description}</p><span className="action-link">Open →</span></button>)}</div>}
  </div></section>;
}

export function LedgerView() {
  const [books, setBooks] = useState(seedBooks);
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [modal, setModal] = useState<"book" | "session" | "highlight" | null>(null);
  const [selectedId, setSelectedId] = useState(seedBooks[0].id);
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ title: "", author: "", page: "", total: "", pages: "", minutes: "", highlight: "" });
  useEffect(() => { setBooks(loadBooks()); setLogs(loadLogs()); }, []);
  useEffect(() => { if (modal && !dialog.current?.open) dialog.current?.showModal(); if (!modal && dialog.current?.open) dialog.current.close(); }, [modal]);

  // "Upload a book" notes workflow: download a spreadsheet template, fill it offline, re-upload.
  const notesDialog = useRef<HTMLDialogElement>(null);
  const [notesBook, setNotesBook] = useState<{ id: string; title: string; author: string } | null>(null);
  const [notesBookOpenIntent, setNotesBookOpenIntent] = useState(false);
  const [newBookForm, setNewBookForm] = useState({ title: "", author: "" });
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<"manual" | "upload">("manual");
  const [manualNote, setManualNote] = useState({ record_type: "highlight", text: "", interpretation: "", principle: "", hall: "" });
  const notesOpen = notesBook !== null || notesBookOpenIntent;
  useEffect(() => { if (notesOpen && !notesDialog.current?.open) notesDialog.current?.showModal(); if (!notesOpen && notesDialog.current?.open) notesDialog.current.close(); }, [notesOpen]);

  function closeNotes() {
    setNotesBook(null); setNotesBookOpenIntent(false); setNewBookForm({ title: "", author: "" });
    setImportPreview(null); setImportSummary(null); setImportError(null);
    setEntryMode("manual"); setManualNote({ record_type: "highlight", text: "", interpretation: "", principle: "", hall: "" });
  }

  function saveManualNote(event: React.FormEvent) {
    event.preventDefault();
    if (!notesBook || (!manualNote.text.trim() && !manualNote.principle.trim())) return;
    const row: ImportRow = { rowNumber: 1, values: {
      record_type: manualNote.record_type, text: manualNote.text.trim() || undefined,
      interpretation: manualNote.interpretation.trim() || undefined, principle: manualNote.principle.trim() || undefined,
      hall: manualNote.hall || undefined,
    } };
    const summary = commitRows([row], { sourceId: notesBook.id, sourceTitle: notesBook.title });
    setImportSummary(summary);
    setManualNote({ record_type: "highlight", text: "", interpretation: "", principle: "", hall: "" });
    setBooks(loadBooks());
  }

  function startNewBookUpload() { setNotesBookOpenIntent(true); }

  function createBookForUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!newBookForm.title.trim()) return;
    const book: StoredBook = { id: uid("book"), title: newBookForm.title.trim(), author: newBookForm.author.trim() || "Unknown author", currentPage: 0, totalPages: 1, completed: false, highlights: [], principles: 0, lastRead: "Today" };
    persist([...books, book]);
    setNotesBook({ id: book.id, title: book.title, author: book.author });
  }

  async function handleNotesFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !notesBook) return;
    setImportError(null); setImportSummary(null);
    try {
      const buffer = await file.arrayBuffer();
      const rows = await xlsxImporter.parse(buffer);
      setImportPreview(xlsxImporter.preview(rows));
    } catch {
      setImportError("Couldn't read that file. Make sure it's the downloaded template, saved as .xlsx.");
      setImportPreview(null);
    }
    event.target.value = "";
  }

  function confirmImport() {
    if (!importPreview || !notesBook) return;
    const summary = commitRows(importPreview.rows, { sourceId: notesBook.id, sourceTitle: notesBook.title });
    setImportSummary(summary);
    setImportPreview(null);
    setBooks(loadBooks());
  }
  function persist(next: StoredBook[], nextLogs = logs) { setBooks(next); saveBooks(next); setLogs(nextLogs); saveLogs(nextLogs); }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (modal === "book" && form.title.trim()) {
      persist([...books, { id: uid("book"), title: form.title, author: form.author || "Unknown author", currentPage: Number(form.page) || 0, totalPages: Number(form.total) || 1, completed: false, highlights: [], principles: 0, lastRead: "Today" }]);
    }
    if (modal === "session") {
      const pages = Number(form.pages) || 0; const book = books.find((item) => item.id === selectedId); if (!book) return;
      const nextBooks = books.map((item) => item.id === selectedId ? { ...item, currentPage: Math.min(item.totalPages, item.currentPage + pages), completed: item.currentPage + pages >= item.totalPages, lastRead: "Today" } : item);
      persist(nextBooks, [{ id: uid("log"), bookId: book.id, bookTitle: book.title, pages, minutes: Number(form.minutes) || 0, date: new Date().toLocaleDateString("en-GB"), createdAt: new Date().toISOString() }, ...logs]);
      awardPoints("reading-session", `Logged ${pages} pages · ${book.title}`, POINTS.readingSession);
    }
    if (modal === "highlight" && form.highlight.trim()) {
      const book = books.find((item) => item.id === selectedId);
      persist(books.map((item) => item.id === selectedId ? { ...item, highlights: [...item.highlights, form.highlight.trim()] } : item));
      awardPoints("highlight", "Added a highlight", POINTS.highlight);
      if (book) {
        const highlight = addHighlight({ sourceId: book.id, text: form.highlight.trim() });
        registerCard("highlight", highlight.id, book.title, highlight.text);
      }
    }
    setForm({ title: "", author: "", page: "", total: "", pages: "", minutes: "", highlight: "" }); setModal(null);
  }
  const pagesRead = books.reduce((sum, book) => sum + book.currentPage, 0);
  const highlights = books.reduce((sum, book) => sum + book.highlights.length, 0) + 41;
  return <section className="view active"><div className="content"><PageHeader eyebrow="Reading as acquisition" title="Reading Ledger" intro="Measure what reading produces: remembered explanations, challenged ideas, tested principles, and revised models." />
    <div className="ledger-actions"><button className="small-btn primary" onClick={() => setModal("book")}>＋ Add a book</button><button className="small-btn" onClick={() => setModal("session")}>Log reading session</button><button className="small-btn" onClick={() => setModal("highlight")}>Add highlight</button><button className="small-btn" onClick={startNewBookUpload}>⇪ Upload a book's notes</button></div>
    <article className="card"><div className="kicker">Living ledger</div><div className="stat-row"><div className="stat"><b>{pagesRead}</b><span>pages recorded</span></div><div className="stat"><b>{books.filter((book) => !book.completed).length}</b><span>books active</span></div><div className="stat"><b>{books.filter((book) => book.completed).length}</b><span>completed</span></div><div className="stat"><b>{highlights}</b><span>highlights</span></div></div></article><Rule />
    <div className="ledger-books">{books.map((book) => <article className="card ledger-book" key={book.id}><div><div className="kicker">{book.completed ? "Completed" : "In progress"}</div><h3>{book.title}</h3><p className="meta">{book.author} · last read {book.lastRead} · {book.highlights.length} highlights · {book.principles} principles</p></div><div className="ledger-progress"><span>{Math.round(book.currentPage / book.totalPages * 100)}%</span><div className="progress"><span style={{ width: `${Math.round(book.currentPage / book.totalPages * 100)}%` }} /></div><small>{book.currentPage} of {book.totalPages} pages</small></div><div className="button-row"><button className="ghost-btn" onClick={() => setNotesBook({ id: book.id, title: book.title, author: book.author })}>Notes</button><button className="ghost-btn" onClick={() => { const next = books.map((item) => item.id === book.id ? { ...item, completed: true, currentPage: item.totalPages } : item); persist(next); }}>Mark complete</button></div></article>)}</div>
    <Rule /><h2 className="section-title">Reading history</h2><div className="history">{logs.length ? logs.map((log) => <div key={log.id}><strong>{log.bookTitle}</strong><span>{log.pages} pages · {log.minutes} minutes · {log.date}</span></div>) : <div><strong>No sessions logged on this device yet.</strong><span>Your first session will appear here and survive refresh.</span></div>}</div>
    <dialog ref={dialog} onClose={() => setModal(null)}><form onSubmit={submit}><div className="modal-head"><div><div className="kicker">Reading ledger</div><h2>{modal === "book" ? "Add a book" : modal === "session" ? "Log a session" : "Preserve a highlight"}</h2></div><button type="button" className="close" onClick={() => setModal(null)}>×</button></div><div className="modal-body form-grid">
      {modal !== "book" && <label className="form-span">Book<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>{books.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}</select></label>}
      {modal === "book" && <><label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Author<input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label><label>Current page<input type="number" min="0" value={form.page} onChange={(e) => setForm({ ...form, page: e.target.value })} /></label><label>Total pages<input type="number" min="1" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></label></>}
      {modal === "session" && <><label>Pages read<input type="number" min="0" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} /></label><label>Minutes<input type="number" min="0" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></label></>}
      {modal === "highlight" && <label className="form-span">Highlight<textarea required value={form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.value })} /></label>}
      <div className="form-span modal-actions"><span className="voice-note">Stored locally on this device</span><button className="small-btn primary">Save to ledger</button></div>
    </div></form></dialog>
    <dialog ref={notesDialog} onClose={closeNotes}><div className="modal-head"><div><div className="kicker">Book notes</div><h2>{notesBook ? notesBook.title : "Upload a book's notes"}</h2></div><button type="button" className="close" onClick={closeNotes}>×</button></div><div className="modal-body">
      {!notesBook ? <form onSubmit={createBookForUpload} className="form-grid">
        <label>Title<input required value={newBookForm.title} onChange={(e) => setNewBookForm({ ...newBookForm, title: e.target.value })} /></label>
        <label>Author<input value={newBookForm.author} onChange={(e) => setNewBookForm({ ...newBookForm, author: e.target.value })} /></label>
        <div className="form-span modal-actions"><span className="voice-note">Creates the book, then gives you the notes template</span><button className="small-btn primary">Continue →</button></div>
      </form> : <>
        <div className="entry-toggle">
          <button type="button" className={`pill${entryMode === "manual" ? " active" : ""}`} onClick={() => setEntryMode("manual")}>Add manually</button>
          <button type="button" className={`pill${entryMode === "upload" ? " active" : ""}`} onClick={() => setEntryMode("upload")}>Upload spreadsheet</button>
        </div>

        {entryMode === "manual" ? <form onSubmit={saveManualNote} className="form-grid">
          <label>Type<select value={manualNote.record_type} onChange={(e) => setManualNote({ ...manualNote, record_type: e.target.value })}><option value="highlight">Highlight / note</option><option value="question">Question</option></select></label>
          <label>Hall (optional)<select value={manualNote.hall} onChange={(e) => setManualNote({ ...manualNote, hall: e.target.value })}><option value="">—</option>{halls.map((hall) => <option key={hall.id} value={hall.title}>{hall.title}</option>)}</select></label>
          <label className="form-span">Text<textarea value={manualNote.text} onChange={(e) => setManualNote({ ...manualNote, text: e.target.value })} placeholder="The passage, note, or question…" /></label>
          <label className="form-span">Interpretation (optional)<textarea value={manualNote.interpretation} onChange={(e) => setManualNote({ ...manualNote, interpretation: e.target.value })} placeholder="What you think it means…" /></label>
          <label className="form-span">Principle (optional)<textarea value={manualNote.principle} onChange={(e) => setManualNote({ ...manualNote, principle: e.target.value })} placeholder="A standalone principle this supports…" /></label>
          <div className="form-span modal-actions"><span className="voice-note">Saved straight into {notesBook.title}</span><button className="small-btn primary" disabled={!manualNote.text.trim() && !manualNote.principle.trim()}>Save note</button></div>
        </form> : <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="kicker">Recommended import workflow</div>
            <ol className="import-steps">
              <li><strong>Download</strong> the Alexandria notes template.</li>
              <li><strong>Give the template and your raw notes to Claude or GPT</strong> and ask it to place every note into the existing columns without changing the headers.</li>
              <li><strong>Download the completed .xlsx</strong> from that AI chat.</li>
              <li><strong>Upload it here</strong>, review the preview, then confirm. Alexandria routes highlights, interpretations, questions, principles and Hall tags into their proper stores.</li>
            </ol>
          </div>
          <p className="page-intro">One row per knowledge item. The spreadsheet is the contract: keep its column names unchanged.</p>
          <div className="button-row"><button type="button" className="small-btn primary" onClick={() => downloadBlob(createNotesTemplate(notesBook), `${notesBook.title.replace(/[^a-z0-9]+/gi, "-")}-notes-template.xlsx`)}>⇩ Download notes template (.xlsx)</button>
            <label className="small-btn file-label">Upload filled notes<input type="file" accept=".xlsx" onChange={handleNotesFile} /></label></div>
          {importError && <p className="saved-note">{importError}</p>}
          {importPreview && <div className="top-gap">
            <p className="meta">{importPreview.rows.length} rows read{importPreview.issues.length ? ` · ${importPreview.issues.length} will be skipped (no text or principle)` : ""}.</p>
            <div className="feedback-grid">
              <article className="diag"><strong>Highlights</strong><span>{importPreview.mapped.filter((item) => "capturedAt" in item).length}</span></article>
              <article className="diag"><strong>Principles</strong><span>{importPreview.mapped.filter((item) => "statement" in item).length}</span></article>
              <article className="diag"><strong>Interpretations</strong><span>{importPreview.mapped.filter((item) => !("capturedAt" in item) && !("statement" in item)).length}</span></article>
            </div>
            <button type="button" className="small-btn primary top-gap" onClick={confirmImport}>Confirm import</button>
          </div>}
        </>}
        {importSummary && <p className="saved-note top-gap">Imported {importSummary.highlights} highlights, {importSummary.principles} principles, {importSummary.interpretations} interpretations, and {importSummary.questions} questions into {notesBook.title}.</p>}
      </>}
    </div></dialog>
  </div></section>;
}

export function ScriptoriumView() {
  const [mode, setMode] = useState("Voice / dictation");
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const modes = ["Voice / dictation", "Paste notes", "Add highlight", "Add source", "Import spreadsheet"];
  function preserve() { if (!text.trim()) return; const rows = JSON.parse(localStorage.getItem("alexandria-scriptorium") || "[]"); localStorage.setItem("alexandria-scriptorium", JSON.stringify([{ text, mode, at: new Date().toISOString() }, ...rows])); setText(""); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  return <section className="view active"><div className="content"><PageHeader eyebrow="Knowledge entering Alexandria" title="The Scriptorium" intro="Capture first. Process with care. Nothing enters the Library before it has survived examination." />
    <div className="pipeline">{["Capture", "Process", "Interrogate", "Approve", "Enter Library"].map((label, index) => <div className="pipe" key={label}><b>{["I", "II", "III", "IV", "V"][index]}</b>{label}</div>)}</div>
    <div className="scriptorium-layout"><nav className="ingest-tabs">{modes.map((item) => <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item}</button>)}</nav><article className="card ingest-panel"><div className="kicker">{mode}</div><h2>{mode === "Import spreadsheet" ? "Bring an existing archive into order" : "Record what survived the encounter"}</h2>{mode === "Import spreadsheet" ? <div className="dropzone"><div className="drop-icon">⇧</div><h3>Drop an .xlsx or .csv file here</h3><p className="meta">Files are not uploaded in this prototype. The interface is ready for validation and preview.</p><button className="small-btn">Download template</button> <label className="small-btn primary file-label">Choose file<input type="file" accept=".xlsx,.csv" /></label></div> : <><textarea className="answer" value={text} onChange={(event) => setText(event.target.value)} placeholder={mode === "Add source" ? "Source title, author, and why it belongs…" : "Speak or paste without prematurely organising the thought…"} /><div className="mic-row"><span className="voice-note"><span className="voice-orb">◉</span> Dictation-ready</span><button className="small-btn primary" onClick={preserve}>Preserve for processing</button></div>{saved && <p className="saved-note">Entry preserved in the processing queue.</p>}</>}</article></div>
  </div></section>;
}

export function CapabilityView() {
  const groups = [
    ["Knowledge", "Recall · Comprehension · Synthesis", "knowledge", ["Reconstructed 12 principles without viewing the source.", "Connected one explanation across four disciplines."]],
    ["Reason", "Logic · First Principles · Counterargument · Probabilistic Judgment", "reason", ["Named disconfirming evidence before five consequential decisions.", "Generated the strongest opposing case in seven sessions."]],
    ["Communication", "Clarity · Explanation · Compression · Oratory · Storytelling · Persuasion", "communication", ["Completed 8 impromptu Forum sessions.", "Compressed a five-minute explanation to thirty seconds."]],
    ["Action", "Decision Making · Application · Experimentation · Feedback Incorporation", "action", ["Applied 14 principles in live decisions.", "Recorded outcomes for eight experiments."]],
    ["Intellectual character", "Curiosity · Willingness to Revise · Independence · Tolerance for Uncertainty", "action", ["Revised 4 prior conclusions following contradictory evidence.", "Kept three important questions unresolved rather than forcing certainty."]],
  ] as const;
  return <section className="view active"><div className="content"><PageHeader eyebrow="Evidence of practice" title="Academy · Capability Map" intro="A record of what you have practised, demonstrated, revised, and carried into action—not a game score." /><div className="cap-grid">{groups.map(([label, title, capability, statements]) => <article className="card cap-group" key={label}><div className="kicker">{label}</div><h3>{title}</h3>{statements.map((statement, index) => { const evidence = capabilityEvidence.find((item) => item.capability === capability && item.statement.startsWith(statement.slice(0, 12))); return <div className="evidence" key={statement}><div className="evidence-mark">{index === 0 ? "◆" : "◇"}</div><p>{statement}<span>{evidence?.provenance ?? (index === 0 ? "Demonstrated across recent sessions" : "Developing through deliberate practice")}</span></p></div>; })}</article>)}</div></div></section>;
}
