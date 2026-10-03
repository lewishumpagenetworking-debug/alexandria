"use client";
import { useState } from "react";
import { listDailyWorkflows } from "@/lib/daily-book-workflow";
import type { StoredBook } from "@/lib/application-store";
import { addApplication, listApplications, updateOutcome, markApplicationAttempted } from "@/lib/apply-store";

const STEPS = [
  { label: "Recall", prompt: "Without reopening your notes, explain the book's central argument and three ideas you remember." },
  { label: "Diagnose", prompt: "What is the author trying to explain? Which assumptions, evidence and counterarguments support or weaken the book? Add chapter or page references after checking the source." },
  { label: "Reduce", prompt: "What principles survive your diagnosis? Where does each principle apply, and where does it fail?" },
  { label: "Rebuild", prompt: "Reconstruct the book's model in your own words. How does it serve who you are becoming, and what has it changed in your thinking?" },
  { label: "Apply", prompt: "What principles from this book will I apply?" },
];
interface MetaRecord { responses: string[]; step: number; context: string; action: string; reviewDate: string; applicationId?: string; }
const empty = (): MetaRecord => ({ responses: STEPS.map(() => ""), step: 0, context: "", action: "", reviewDate: "" });
function read(id: string): MetaRecord {
  if (typeof window === "undefined") return empty();
  try { return JSON.parse(localStorage.getItem(`alexandria-book-meta-v1:${id}`) || "null") ?? empty(); } catch { return empty(); }
}
export function BookMetaPage({ book }: { book: StoredBook }) {
  const [record, setRecord] = useState(() => read(book.id));
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState(() => listApplications().find(a => a.id === read(book.id).applicationId)?.outcome || "");
  const application = listApplications().find(a => a.id === record.applicationId);
  const complete = book.completed;
  const stage = STEPS[Math.min(record.step, STEPS.length - 1)];
  const persist = (next: MetaRecord) => { localStorage.setItem(`alexandria-book-meta-v1:${book.id}`, JSON.stringify(next)); setRecord(next); };
  function commit(event: React.FormEvent) {
    event.preventDefault();
    if (!record.responses[record.step]?.trim()) return;
    if (record.step === 4) {
      if (!record.context.trim() || !record.action.trim() || !record.reviewDate) return;
      const application = addApplication({ sourceId: book.id, sourceTitle: book.title, principleText: record.responses[4], context: record.context, action: record.action, status: "planned", reviewDate: record.reviewDate });
      persist({ ...record, step: 5, applicationId: application.id });
    } else persist({ ...record, step: record.step + 1 });
    setMessage("Stage committed. Your book breakdown is saved.");
    window.dispatchEvent(new Event("alexandria:data"));
  }
  return <article className="card book-meta-card">
    <div className="kicker">Whole-book meta page · {book.author}</div><h2>{book.title}</h2>
    <p className="meta">Reading → Recall → Diagnose → Reduce → Rebuild → Apply → Outcome review</p>
    <details className="top-gap"><summary>Principles and explanations developed while reading</summary>{listDailyWorkflows().filter(flow => flow.bookId === book.id && flow.drafts.principle).map(flow => <div className="note-item" key={flow.id}><strong>{flow.day} · {flow.drafts.location}</strong><p>{flow.drafts.principle}</p><p className="meta">Conditions: {flow.drafts.boundaries}</p>{flow.drafts.rewrite && <p>{flow.drafts.rewrite}</p>}</div>)}</details>
    {!complete && <p className="saved-note">This breakdown is provisional while you are still reading. Use it now if useful, then revise it after finishing as your model of the book changes.</p>}
    {record.step < 5 ? <form onSubmit={commit} className="form-grid top-gap">
      <label className="form-span">{record.step + 1}. {stage.label}<p className="meta">{stage.prompt}</p><textarea required value={record.responses[record.step]} onChange={event => { const responses = [...record.responses]; responses[record.step] = event.target.value; persist({ ...record, responses }); }} /></label>
      {record.step === 4 && <>
        <label className="form-span">Trigger / real situation<input required value={record.context} onChange={event => persist({ ...record, context: event.target.value })} /></label>
        <label className="form-span">Specific action and evidence of success<textarea required value={record.action} onChange={event => persist({ ...record, action: event.target.value })} /></label>
        <label>Outcome review date<input required type="date" value={record.reviewDate} onChange={event => persist({ ...record, reviewDate: event.target.value })} /></label>
      </>}
      <div className="form-span"><button className="small-btn primary" disabled={!record.responses[record.step]?.trim()}>{record.step === 4 ? "Commit application →" : "Commit and continue →"}</button></div>
    </form> : <>
      <p className="saved-note top-gap">Breakdown committed. Application outcome review: {record.reviewDate}. Your commitment is also in Apply.</p>
      {application?.status === "planned" ? <button className="small-btn" onClick={() => { if (application) markApplicationAttempted(application.id); setMessage("Action marked attempted. Record its outcome below."); }}>Mark action attempted</button> : <>
      <label className="top-gap">What happened? What will you revise?<textarea value={outcome} onChange={event => setOutcome(event.target.value)} /></label>
      <button className="small-btn primary top-gap" disabled={!outcome.trim()} onClick={() => { if (record.applicationId) updateOutcome(record.applicationId, outcome.trim()); setMessage("Outcome saved. Review the evidence before calling the principle integrated."); window.dispatchEvent(new Event("alexandria:data")); }}>Save outcome review</button>
      </>}
    </>}
    {record.step > 0 && <details className="top-gap"><summary>Committed whole-book breakdown</summary>{STEPS.slice(0, record.step).map((step, index) => <div className="note-item" key={step.label}><strong>{step.label}</strong><p style={{ whiteSpace: "pre-wrap" }}>{record.responses[index]}</p></div>)}</details>}
    {message && <p className="meta" role="status">{message}</p>}
  </article>;
}
