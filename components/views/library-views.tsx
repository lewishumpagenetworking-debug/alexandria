"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { capabilityEvidence, halls } from "@/data/mock-data";
import { loadBooks, loadLogs, saveBooks, saveLogs, seedBooks, uid, type ReadingLog, type StoredBook } from "@/lib/application-store";
import { progressionSummary, recordActivity } from "@/lib/progression-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";
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

export function LibraryView() {
  const [books, setBooks] = useState(seedBooks);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StoredBook | null>(null);
  useEffect(() => setBooks(loadBooks()), []);
  const shown = books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase()));
  if (selected) return <section className="view active"><div className="content"><button className="action-link back" onClick={() => setSelected(null)}>← Return to the Library</button><div className="source-hero"><div className="folio-cover">{selected.title}</div><div><div className="eyebrow">Source · Book</div><h1 className="page-title">{selected.title}</h1><p className="page-intro">{selected.author} · {selected.currentPage} of {selected.totalPages} pages · {selected.highlights.length} real highlights</p><div className="progress"><span style={{ width: `${Math.round(selected.currentPage / selected.totalPages * 100)}%` }} /></div></div></div><Rule /><div className="knowledge-chain">
    <article className="chain-item"><div>Captured material</div><p>{selected.highlights.length ? selected.highlights.join(" · ") : "Nothing captured yet. Add a highlight after your next reading session."}</p></article>
    <article className="chain-item"><div>Next retention step</div><p>{selected.highlights.length ? "Interrogate one highlight from memory, then reduce it to a principle you can defend." : "Read, then capture the idea that changed or sharpened your model of the world."}</p></article>
    <article className="chain-item"><div>Application</div><p>No application is assumed. Alexandria should only record one after you deliberately test a principle in life or work.</p></article>
    <article className="chain-item"><div>Revision</div><p>No revision recorded yet. Return after reality gives you evidence.</p></article>
  </div></div></section>;
  return <section className="view active"><div className="content"><PageHeader eyebrow="The external memory" title="The Library" intro="Sources are beginnings, not trophies. Follow an idea from encounter through challenge, application, and revision." />
    <div className="section-tools"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, authors, principles…" aria-label="Search library" /><span className="result-count">{shown.length} sources found</span></div>
    <div className="source-grid library-shelves">{shown.map((book, index) => <button className="book-card" onClick={() => setSelected(book)} key={book.id}><div className={`folio-cover tone-${index % 4}`}>{book.title}</div><div><span className="type">Book · {book.author}</span><h3>{book.title}</h3><p>{book.currentPage} / {book.totalPages} pages · {book.highlights.length} highlights · {book.principles} principles</p><div className="progress"><span style={{ width: `${Math.round(book.currentPage / book.totalPages * 100)}%` }} /></div></div></button>)}</div>
  </div></section>;
}

export function HallsView() {
  const [selected, setSelected] = useState<(typeof halls)[number] | null>(null);
  return <section className="view active"><div className="content"><PageHeader eyebrow="Connected disciplines" title="Halls of Knowledge" intro="A principle may enter through one hall and illuminate another. These are perspectives, never prisons." />
    {selected ? <><button className="action-link back" onClick={() => setSelected(null)}>← Return to all halls</button><article className="hall-detail" data-roman={selected.roman}><div className="eyebrow">Hall {selected.roman}</div><h2>{selected.title}</h2><p>{selected.description}</p><div className="hall-ledger"><div><b>{selected.count.split(" · ")[0]}</b><span>in active circulation</span></div><div><b>6 active questions</b><span>awaiting synthesis</span></div><div><b>3 additions</b><span>within the last fortnight</span></div></div></article><div className="source-grid"><article className="card"><div className="kicker">Governing question</div><h3>What survives when explanation meets contradictory evidence?</h3></article><article className="card"><div className="kicker">Living principle</div><h3>Systems reveal their purpose through what they repeatedly preserve.</h3></article><article className="card"><div className="kicker">Related sources</div><h3>{selected.title === "Natural Philosophy" ? "Cosmos · The Selfish Gene · A Brief History of Time" : "Thinking, Fast and Slow · Superforecasting · Meditations"}</h3></article></div></> : <div className="hall-grid">{halls.map((hall) => <button className="card hall" data-roman={hall.roman} key={hall.id} onClick={() => setSelected(hall)}><div className="count">{hall.count}</div><h3>{hall.title}</h3><p>{hall.description}</p><span className="action-link">Enter hall →</span></button>)}</div>}
  </div></section>;
}

export function LedgerView() {
  const [books, setBooks] = useState(seedBooks);
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [modal, setModal] = useState<"book" | "session" | "highlight" | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ title: "", author: "", page: "", total: "", pages: "", minutes: "", highlight: "" });
  useEffect(() => { const loaded = loadBooks(); setBooks(loaded); setLogs(loadLogs()); setSelectedId((current) => current || loaded[0]?.id || ""); }, []);
  useEffect(() => { if (modal && !dialog.current?.open) dialog.current?.showModal(); if (!modal && dialog.current?.open) dialog.current.close(); }, [modal]);
  function persist(next: StoredBook[], nextLogs = logs) { setBooks(next); saveBooks(next); setLogs(nextLogs); saveLogs(nextLogs); }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (modal === "book" && form.title.trim()) {
      const id = uid("book");
      persist([...books, { id, title: form.title, author: form.author || "Unknown author", currentPage: Number(form.page) || 0, totalPages: Number(form.total) || 1, completed: false, highlights: [], principles: 0, lastRead: "Today" }]);
      setSelectedId(id);
    }
    if (modal === "session") {
      const pages = Number(form.pages) || 0; const book = books.find((item) => item.id === selectedId); if (!book) return;
      const nextBooks = books.map((item) => item.id === selectedId ? { ...item, currentPage: Math.min(item.totalPages, item.currentPage + pages), completed: item.currentPage + pages >= item.totalPages, lastRead: "Today" } : item);
      persist(nextBooks, [{ id: uid("log"), bookId: book.id, bookTitle: book.title, pages, minutes: Number(form.minutes) || 0, date: new Date().toLocaleDateString("en-GB") }, ...logs]);
      recordActivity("reading_session", `Logged reading: ${book.title}`, book.id);
    }
    if (modal === "highlight" && form.highlight.trim()) {
      const book = books.find((item) => item.id === selectedId);
      persist(books.map((item) => item.id === selectedId ? { ...item, highlights: [...item.highlights, form.highlight.trim()] } : item));
      recordActivity("highlight", `Saved highlight${book ? `: ${book.title}` : ""}`, selectedId || undefined);
    }
    setForm({ title: "", author: "", page: "", total: "", pages: "", minutes: "", highlight: "" }); setModal(null);
  }
  const pagesRead = books.reduce((sum, book) => sum + book.currentPage, 0);
  const highlights = books.reduce((sum, book) => sum + book.highlights.length, 0);
  const progress = progressionSummary();
  return <section className="view active"><div className="content"><PageHeader eyebrow="Reading as acquisition" title="Reading Ledger" intro="Measure what reading produces: remembered explanations, challenged ideas, tested principles, and revised models." />
    <div className="ledger-actions"><button className="small-btn primary" onClick={() => setModal("book")}>＋ Add a real book</button><button className="small-btn" disabled={!books.length} onClick={() => setModal("session")}>Log reading session</button><button className="small-btn" disabled={!books.length} onClick={() => setModal("highlight")}>Add highlight</button><button className="small-btn" disabled={!books.length} onClick={() => recordActivity("review_cycle", "Completed deliberate review cycle")}>Complete review cycle +20</button></div>
    <article className="card"><div className="kicker">Living ledger</div><div className="stat-row"><div className="stat"><b>{pagesRead}</b><span>pages recorded</span></div><div className="stat"><b>{books.filter((book) => !book.completed).length}</b><span>books active</span></div><div className="stat"><b>{highlights}</b><span>highlights</span></div><div className="stat"><b>{progress.reviewCycles}</b><span>review cycles</span></div></div></article><Rule />
    {!books.length && <div className="empty"><strong>Your Library is deliberately empty.</strong><span>Add the book you are actually reading. Alexandria will build from your real notes, reviews, interrogations and applications—never demo data.</span><div className="top-gap"><button className="small-btn primary" onClick={() => setModal("book")}>Add your first book</button></div></div>}
    <div className="ledger-books">{books.map((book) => <article className="card ledger-book" key={book.id}><div><div className="kicker">{book.completed ? "Completed" : "In progress"}</div><h3>{book.title}</h3><p className="meta">{book.author} · last read {book.lastRead}</p></div><div className="ledger-progress"><span>{Math.round(book.currentPage / book.totalPages * 100)}%</span><div className="progress"><span style={{ width: `${Math.round(book.currentPage / book.totalPages * 100)}%` }} /></div><small>{book.currentPage} of {book.totalPages} pages</small></div><button className="ghost-btn" onClick={() => { const next = books.map((item) => item.id === book.id ? { ...item, completed: true, currentPage: item.totalPages } : item); persist(next); }}>Mark complete</button></article>)}</div>
    <Rule /><h2 className="section-title">Reading history</h2><div className="history">{logs.length ? logs.map((log) => <div key={log.id}><strong>{log.bookTitle}</strong><span>{log.pages} pages · {log.minutes} minutes · {log.date}</span></div>) : <div><strong>No sessions logged on this device yet.</strong><span>Your first session will appear here and survive refresh.</span></div>}</div>
    <dialog ref={dialog} onClose={() => setModal(null)}><form onSubmit={submit}><div className="modal-head"><div><div className="kicker">Reading ledger</div><h2>{modal === "book" ? "Add a book" : modal === "session" ? "Log a session" : "Preserve a highlight"}</h2></div><button type="button" className="close" onClick={() => setModal(null)}>×</button></div><div className="modal-body form-grid">
      {modal !== "book" && <label className="form-span">Book<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>{books.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}</select></label>}
      {modal === "book" && <><label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Author<input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label><label>Current page<input type="number" min="0" value={form.page} onChange={(e) => setForm({ ...form, page: e.target.value })} /></label><label>Total pages<input type="number" min="1" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></label></>}
      {modal === "session" && <><label>Pages read<input type="number" min="0" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} /></label><label>Minutes<input type="number" min="0" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></label></>}
      {modal === "highlight" && <label className="form-span">Highlight<textarea required value={form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.value })} /></label>}
      <div className="form-span modal-actions"><span className="voice-note">Stored locally on this device</span><button className="small-btn primary">Save to ledger</button></div>
    </div></form></dialog>
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
