"use client";

import { useMemo, useState } from "react";
import { halls } from "@/data/mock-data";
import { loadBooks, saveBooks, uid, type StoredBook } from "@/lib/application-store";
import { commitRows, xlsxImporter, type ImportSummary } from "@/services/import/xlsx-importer";
import type { ImportPreview } from "@/services/import/spreadsheet-import";

const AI_PROMPT = `You are formatting reading notes for Alexandria.

I will provide:
1. Alexandria's spreadsheet template.
2. My raw notes from a book/document.

Return a completed spreadsheet using the EXISTING COLUMN HEADERS exactly:
record_type, source_title, source_creator, location, text, interpretation, principle, hall, priority

Rules:
- Do not rename, remove, reorder, or add columns.
- Use one row per distinct knowledge item.
- record_type must be "highlight" or "question".
- source_title = exact book/document title.
- source_creator = author/creator.
- location = page/chapter/timestamp when known.
- text = the original highlight, raw note, or question.
- interpretation = a concise explanation in my own words where justified.
- principle = a reusable standalone principle only when the note genuinely supports one.
- hall is optional. Use only one of: Natural Philosophy, Human Nature, Strategy & Power, Commerce & Creation, Logic & Systems, The Examined Life.\n- priority is optional and must be 1-5. Use 5 only for unusually important, broadly applicable, or foundational ideas; 3 for normal useful notes; 1 for low-value context. Leave blank if unsure.\n- Spreadsheet row order does NOT control learning order. Treat every row as an independent knowledge item; Alexandria will prioritise and shuffle them.
- Leave a cell blank rather than inventing information.
- Preserve my meaning. Do not fabricate quotes, page numbers, conclusions, or principles.
- Return the completed file in CSV or XLSX format ready for re-upload into Alexandria.`;

export function ImportNotesWorkspace({ onBack, onComplete, initialSourceId = "" }: { onBack: () => void; onComplete: () => void; initialSourceId?: string }) {
  const [books, setBooks] = useState(() => loadBooks());
  const [selectedId, setSelectedId] = useState(initialSourceId);
  const [newBook, setNewBook] = useState({ title: "", author: "" });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(() => books.find((b) => b.id === selectedId) ?? null, [books, selectedId]);

  function createBook() {
    if (!newBook.title.trim()) return;
    const book: StoredBook = {
      id: uid("book"),
      title: newBook.title.trim(),
      author: newBook.author.trim() || "Unknown author",
      currentPage: 0,
      totalPages: 1,
      completed: false,
      highlights: [],
      principles: 0,
      lastRead: "Today",
    };
    const next = [...books, book];
    saveBooks(next);
    setBooks(next);
    setSelectedId(book.id);
    setNewBook({ title: "", author: "" });
  }

  async function handleFile(file?: File) {
    if (!file || !selected) return;
    setError("");
    setSummary(null);
    try {
      const rows = await xlsxImporter.parse(await file.arrayBuffer());
      if (!rows.length) throw new Error("empty");
      setPreview(xlsxImporter.preview(rows));
    } catch {
      setPreview(null);
      setError("Alexandria could not read that file. Use the template and upload a .csv or .xlsx file with the original column headers unchanged.");
    }
  }

  function confirmImport() {
    if (!preview || !selected) return;
    const result = commitRows(preview.rows, { sourceId: selected.id, sourceTitle: selected.title });
    setSummary(result);
    setPreview(null);
    setBooks(loadBooks());
    window.dispatchEvent(new Event("alexandria:data"));
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const templateHref = "/alexandria/alexandria-notes-template.csv";

  return <section className="view active"><div className="content import-workspace">
    <button className="action-link back" onClick={onBack}>← Back to Library</button>
    <div className="eyebrow">Knowledge intake</div>
    <h1 className="page-title">Import book notes</h1>
    <p className="page-intro">Three steps: choose the source, fill the Alexandria template, then upload it back. Nothing is added until you review the preview.</p>

    <div className="import-step-card">
      <div className="import-step-number">1</div>
      <div>
        <div className="kicker">Choose the source</div>
        <h2>Which book or document do these notes belong to?</h2>
        {books.length > 0 && <label className="import-label">Existing source
          <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setPreview(null); setSummary(null); }}>
            <option value="">Select a source…</option>
            {books.map((book) => <option key={book.id} value={book.id}>{book.title} — {book.author}</option>)}
          </select>
        </label>}
        <div className="import-or">or add a new source</div>
        <div className="form-grid compact-form">
          <label>Title<input value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} placeholder="Book or document title" /></label>
          <label>Author / creator<input value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} placeholder="Author" /></label>
        </div>
        <button type="button" className="small-btn" onClick={createBook} disabled={!newBook.title.trim()}>＋ Add source</button>
        {selected && <p className="saved-note top-gap">Selected: <strong>{selected.title}</strong> by {selected.author}</p>}
      </div>
    </div>

    <div className={"import-step-card" + (!selected ? " disabled-step" : "")}>
      <div className="import-step-number">2</div>
      <div>
        <div className="kicker">Prepare the spreadsheet</div>
        <h2>Download the template and give it to Claude or GPT with your notes.</h2>
        <p className="meta">CSV is the default because it downloads and re-uploads reliably on iPhone, iPad and desktop. Excel .xlsx is also accepted on upload.</p>
        <div className="button-row top-gap">
          <a className={"small-btn primary download-link" + (!selected ? " disabled-link" : "")} href={selected ? templateHref : undefined} download="alexandria-notes-template.csv">⇩ Download template</a>
          <button className="small-btn" type="button" onClick={() => setHelpOpen((v) => !v)}>？ Help me prepare it</button>
        </div>

        <div className="template-map top-gap">
          <div><strong>text</strong><span>Original highlight, note, or question → Notes / Review</span></div>
          <div><strong>interpretation</strong><span>What it means in your own words → source understanding</span></div>
          <div><strong>principle</strong><span>Reusable conclusion → Knowledge Map + Review</span></div>
          <div><strong>hall</strong><span>Optional domain tag → Knowledge Map Hall</span></div>
          <div><strong>location</strong><span>Page / chapter / timestamp → provenance</span></div>\n          <div><strong>priority</strong><span>Optional 1–5 importance signal → helps Alexandria choose what to surface first</span></div>
        </div>

        {helpOpen && <article className="card import-help top-gap">
          <div className="kicker">AI preparation checklist</div>
          <ol className="import-steps">
            <li>Download the template above.</li>
            <li>Open Claude or GPT and attach both <strong>the template</strong> and <strong>your raw notes</strong>.</li>
            <li>Paste the instruction below.</li>
            <li>Ask the AI to return the completed CSV/XLSX file — not a prose summary.</li>
            <li>Download that completed file and return to Alexandria.</li>
          </ol>
          <pre className="import-prompt">{AI_PROMPT}</pre>
          <button className="small-btn primary" type="button" onClick={copyPrompt}>{copied ? "Copied" : "Copy instructions"}</button>
        </article>}
      </div>
    </div>

    <div className={"import-step-card" + (!selected ? " disabled-step" : "")}>
      <div className="import-step-number">3</div>
      <div>
        <div className="kicker">Re-upload</div>
        <h2>Choose the completed spreadsheet.</h2>
        <label className={"import-file-button" + (!selected ? " disabled-link" : "")}>
          ⇧ Choose completed CSV or XLSX
          <input type="file" accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" disabled={!selected} onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        </label>
        {error && <p className="saved-note top-gap">{error}</p>}

        {preview && <div className="import-preview top-gap">
          <div className="card-head"><div><div className="kicker">Preview before import</div><h2>{preview.rows.length} spreadsheet rows found</h2></div></div>
          <div className="feedback-grid">
            <article className="diag"><strong>{preview.mapped.filter((item) => "capturedAt" in item).length}</strong><span>highlights / notes</span></article>
            <article className="diag"><strong>{preview.mapped.filter((item) => "statement" in item).length}</strong><span>principles</span></article>
            <article className="diag"><strong>{preview.mapped.filter((item) => !("capturedAt" in item) && !("statement" in item)).length}</strong><span>interpretations</span></article>
            <article className="diag"><strong>{preview.issues.length}</strong><span>rows needing attention</span></article>
          </div>
          {preview.issues.length > 0 && <div className="import-issues">{preview.issues.slice(0, 8).map((issue) => <div key={issue.rowNumber}>Row {issue.rowNumber}: {issue.message}</div>)}</div>}
          <button className="small-btn primary top-gap" type="button" onClick={confirmImport}>Confirm and place into Alexandria</button>
        </div>}

        {summary && <div className="import-success top-gap">
          <div className="kicker">Import complete</div>
          <h2>Alexandria has allocated the file.</h2>
          <p>{summary.highlights} highlights · {summary.interpretations} interpretations · {summary.principles} principles · {summary.questions} questions</p>
          <button className="small-btn primary" type="button" onClick={onComplete}>Return to Library</button>
        </div>}
      </div>
    </div>
  </div></section>;
}
