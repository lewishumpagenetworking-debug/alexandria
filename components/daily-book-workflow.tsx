"use client";
import { categoryLens, categoryQuestions } from "@/lib/book-categories";
import { useEffect, useRef, useState } from "react";
import { loadBooks, updateBookDetails } from "@/lib/application-store";
import { listApplications, markApplicationAttempted, rescheduleApplication, updateOutcome, type KnowledgeApplication } from "@/lib/apply-store";
import { getHighlightsForSource } from "@/lib/library-notes-store";
import { DAILY_TASKS, advanceDailyTask, commitDailyTask, getDailyWorkflow, ensureDailyWorkflow, listDailyWorkflows, readingTaskStatus, saveDailyDraft } from "@/lib/daily-book-workflow";
import { bookPercent, listCommitments, londonDay, startPercentageCommitment, startCommitment } from "@/lib/reading-execution";
import { VoiceBookSetup } from "@/components/voice-book-setup";
import { DailyReadingTally } from "@/components/daily-reading-tally";
import { AIFeedbackPanel } from "@/components/views/academy-views";

const FIELDS: Record<number, Array<[string, string, string]>> = {
  2: [["location", "Chapter / page / percentage range", "Identify the section you read."], ["recall", "Recall without reopening your notes", "What was the central idea? Explain its reasoning and one example from memory."]],
  3: [["principle", "Reusable principle", "State the general rule in your own words."], ["evidence", "Source passage or supporting note", "Check the book: what supports this principle? Preserve the original wording if quoting."], ["boundaries", "Conditions and exceptions", "Where does this rule hold, and where would it fail?"]],
  4: [["context", "Trigger / real situation", "Where will you use this in work, your school community, or daily life?"], ["action", "Specific action or experiment", "What exactly will you do?"], ["prediction", "Expected result and evidence of success", "What would support or challenge the principle?"], ["reviewDate", "Outcome review date", "Choose when to review the evidence."]],
  5: [["audience", "Who are you helping?", "A beginner, colleague, community member, or yourself."], ["purpose", "What should they understand or be able to do?", "Give the explanation a practical purpose."], ["medium", "Teaching medium", "Write or explain aloud."], ["explanation", "First explanation, from memory", "Use plain language, explain the cause and effect, give an example, and name a limitation. For an aloud explanation, preserve a transcript or written account here."]],
  6: [["gaps", "Where did you struggle or become vague?", "Identify unclear terms, missing reasoning, weak examples or unsupported claims. If none, state what you checked."], ["sourceCheck", "What did you revisit and correct?", "Name the chapter/pages and record what the source actually supports."], ["rewrite", "Rewritten explanation", "Explain it again, more simply and accurately. Include an example and its boundary."]],
};

export function ApplicationOutcomeTask({ application }: { application: KnowledgeApplication }) {
  const [outcome, setOutcome] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  return <article className="card top-gap">
    <div className="kicker">{application.status || "attempted"} · Review due {application.reviewDate}</div>
    <h3>{application.principleText}</h3><p className="meta">{application.sourceTitle}{application.sourceLocation ? ` · ${application.sourceLocation}` : ""}</p>
    <p><strong>Planned action:</strong> {application.action}</p>
    {application.expectedOutcome && <p className="meta">Expected: {application.expectedOutcome}</p>}
    {application.outcome ? <p className="saved-note">Outcome reviewed: {application.outcome}</p> : <>
      {application.status === "planned" ? <button className="small-btn" onClick={() => markApplicationAttempted(application.id)}>Mark action attempted</button> : <form className="form-grid top-gap" onSubmit={event => { event.preventDefault(); try { updateOutcome(application.id, outcome); setMessage("Outcome reviewed."); } catch (error) { setMessage(String(error)); } }}>
        <label className="form-span">What happened? What will you revise?<textarea required value={outcome} onChange={event => setOutcome(event.target.value)} /></label><button className="small-btn primary">Save outcome</button>
      </form>}
      <details className="top-gap"><summary>Action not ready for review?</summary><p className="meta">Choose a future date. This remains outstanding rather than being recorded as applied.</p><form className="button-row" onSubmit={event => { event.preventDefault(); if (date <= londonDay()) { setMessage("Choose a future date."); return; } rescheduleApplication(application.id, date); setMessage("Review postponed; action still outstanding."); }}><label>New review date<input required type="date" min={londonDay()} value={date} onChange={event => setDate(event.target.value)} /></label><button className="small-btn">Reschedule review</button></form></details>
    </>}
    {message && <p className="meta" role="status">{message}</p>}
  </article>;
}

export function DailyBookWorkflow({ sourceId }: { sourceId?: string } = {}) {
  const [books, setBooks] = useState(loadBooks);
  const [selectedId, setSelectedId] = useState("");
  const [day, setDay] = useState(londonDay);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [total, setTotal] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const sync = () => { setBooks(loadBooks()); setRevision(value => value + 1); };
    sync(); window.addEventListener("alexandria:data", sync); window.addEventListener("storage", sync);
    const timer = setInterval(sync, 60000);
    return () => { clearInterval(timer); window.removeEventListener("alexandria:data", sync); window.removeEventListener("storage", sync); };
  }, []);
  void revision;
  const today = londonDay();
  const applications = listApplications();
  const dueBook = books.find(book => applications.some(a => a.sourceId === book.id && !a.outcome && a.reviewDate && a.reviewDate <= today) && !getDailyWorkflow(book.id).finishedAt);
  const active = listCommitments().find(plan => books.some(book => book.id === plan.bookId && !book.completed));
  const inProgress = listDailyWorkflows().find(flow => flow.day === today && !flow.finishedAt && books.some(book => book.id === flow.bookId));
  const id = sourceId || (books.some(book => book.id === selectedId) ? selectedId : dueBook?.id || inProgress?.bookId || active?.bookId || books.find(book => !book.completed)?.id || books[0]?.id || "");
  useEffect(() => { if (!sourceId && !selectedId && id) setSelectedId(id); }, [sourceId, selectedId, id]);
  const book = books.find(item => item.id === id);
  useEffect(() => { if (book) ensureDailyWorkflow(book.id, day); }, [book?.id, day]);
  const workflow = getDailyWorkflow(id, day);
  const committed = !!workflow.committed[String(workflow.step)];
  const plan = listCommitments().find(item => item.bookId === id);
  const reading = readingTaskStatus(id, day);
  const d = workflow.drafts;
  const histories = listDailyWorkflows().filter(flow => flow.bookId === id).sort((a, b) => b.day.localeCompare(a.day));
  const due = applications.filter(a => workflow.dueApplicationIds.includes(a.id));
  const startBook = () => { window.dispatchEvent(new Event("alexandria:start-book")); document.getElementById("reading-books")?.scrollIntoView({ behavior: "smooth" }); };
  function act(action: "commit" | "advance") {
    try { if (action === "commit") { commitDailyTask(id, day); setMessage("Task committed. Continue when you are ready."); } else { advanceDailyTask(id, day); setMessage(""); requestAnimationFrame(() => heading.current?.focus()); } }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this task."); }
  }
  return <article className="card daily-book-workflow">
    <div className="kicker">Daily reading workflow · Modules 3–5</div>
    <h2 ref={heading} tabIndex={-1}>One task. Then the next.</h2>
    {!book ? <><p className="meta">Start a book to create its folder and begin the daily sequence.</p><button className="small-btn primary top-gap" onClick={startBook}>Start Book →</button></> : <>
      <div className="button-row top-gap">
        {!sourceId && <label>Workflow book<select value={id} onChange={event => { setSelectedId(event.target.value); setDay(today); setMessage(""); setTotal(""); }}>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>}
        <label>Session day<select value={day} onChange={event => { setDay(event.target.value); setMessage(""); }}><option value={today}>Today · {today}</option>{histories.filter(flow => flow.day !== today).map(flow => <option key={flow.id} value={flow.day}>{flow.day} · {flow.finishedAt ? "Complete" : "Unfinished"}</option>)}</select></label>
      </div>
      <p className="meta top-gap">Daily target for this book: {book.progressMode === "percentage" ? "14.29 percentage points (100 ÷ 7)" : book.totalPages > 1 ? `${Number((book.totalPages / 7).toFixed(2))} pages (${book.totalPages} ÷ 7)` : "set up pages or percentage tracking"}. Weekly outcome goal: complete at least one book; multiple books may remain active.</p>
      <p className="meta top-gap">{book.title} · {book.author}{d.location ? ` · ${d.location}` : ""}</p>
      <ol className="daily-workflow-steps" aria-label="Daily sequence">{DAILY_TASKS.map((task, index) => workflow.kind === "outcome-review" && index > 0 ? null : index === 0 && workflow.committed["0"] === "not-due" ? null : <li key={task} className={workflow.committed[String(index)] ? "done" : index === workflow.step ? "current" : "locked"} aria-current={!workflow.finishedAt && index === workflow.step ? "step" : undefined}>{workflow.committed[String(index)] ? "✓ " : ""}{task}</li>)}</ol>
      {workflow.finishedAt ? <div className="completion top-gap"><div><div className="kicker">{workflow.kind === "outcome-review" ? "Outcome review complete" : "Daily workflow complete"}</div><h3>{book.title} · {day}</h3><p className="meta">Your work is saved. Planned applications stay outstanding until attempted and reviewed.</p><div className="button-row"><button className="small-btn" onClick={() => { window.location.hash = "review"; }}>Continue to concept review →</button>{!sourceId && workflow.kind === "outcome-review" && books.some(b => !b.completed) && <button className="small-btn primary" onClick={() => { setSelectedId(active?.bookId || books.find(b => !b.completed)?.id || ""); setDay(today); setMessage(""); }}>Continue to today's reading →</button>}<button className="small-btn" onClick={startBook}>Start next book →</button></div></div></div> : <>
        <h3 className="top-gap">{DAILY_TASKS[workflow.step]}</h3>
        {workflow.step === 0 && due.map(application => <ApplicationOutcomeTask key={application.id} application={application} />)}
        {workflow.step === 1 && !committed && <>
          {!plan && day === today && book.progressMode !== "percentage" && <VoiceBookSetup key={`voice-${id}`} book={book} />}
          {!plan && day === today && book.progressMode === "percentage" && <button className="small-btn primary top-gap" onClick={() => {
            try { startPercentageCommitment(book.id, bookPercent(book)); setMessage("Percentage target started. Other active books remain available."); }
            catch(error) { setMessage(error instanceof Error ? error.message : "Could not begin commitment."); }
          }}>Begin seven-day percentage commitment →</button>}
          {!plan && day === today && book.progressMode !== "percentage" && <form className="form-grid top-gap" onSubmit={event => {
            event.preventDefault(); const count = Number(total || (book.totalPages > 1 ? book.totalPages : ""));
            try {
              updateBookDetails(book.id, { title: book.title, author: book.author, totalPages: count });
              startCommitment(book.id, count);
              setTotal("");
              setMessage("Seven-day target started. Other active books remain available.");
            } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start reading."); }
          }}><label>Total pages<input required type="number" min="2" value={total || (book.totalPages > 1 ? book.totalPages : "")} onChange={event => setTotal(event.target.value)} /></label><button className="small-btn primary">Begin seven-day commitment →</button></form>}
          {(book.totalPages > 1 || book.progressMode === "percentage") && day === today && !book.completed && <DailyReadingTally key={id} sourceId={id} />}
          {(book.totalPages > 1 || book.progressMode === "percentage") && day === today && book.completed && !reading.ready && <p className="meta">This book's reading is finished. Start your next book for today's reading sequence.</p>}
          <p className="saved-note top-gap">{Number(reading.pages.toFixed(2))} / {Number(reading.quota.toFixed(2))} {book.progressMode === "percentage" ? "percentage points" : "pages"} recorded · {reading.reason}</p>
          {day !== today && <p className="meta">This is a saved earlier session. Reading credit uses the original dated logs; today's pages count toward today.</p>}
        </>}
        {workflow.step > 1 && <p className="meta">{categoryQuestions(book.category ?? "general")[workflow.step === 4 ? 6 : workflow.step === 6 ? 5 : 0]}</p>}
        {!committed && FIELDS[workflow.step] && <form className="form-grid top-gap" onSubmit={event => { event.preventDefault(); act("commit"); }}>
          {FIELDS[workflow.step].map(([key, label, prompt]) => <label className="form-span" key={key}>{label}<p className="meta">{prompt}</p>{key === "reviewDate" ? <input required type="date" value={d[key] || ""} onChange={event => saveDailyDraft(id, day, key, event.target.value)} /> : key === "medium" ? <select required value={d[key] || ""} onChange={event => saveDailyDraft(id, day, key, event.target.value)}><option value="">Choose a medium</option><option>Written explanation</option><option>Explain aloud, then preserve a transcript</option></select> : <textarea required value={d[key] || ""} onChange={event => saveDailyDraft(id, day, key, event.target.value)} placeholder={prompt} />}</label>)}
          <button className="small-btn primary">Commit {DAILY_TASKS[workflow.step].toLowerCase()} →</button>
        </form>}
        {!committed && (workflow.step === 0 || workflow.step === 1) && <button className="small-btn primary top-gap" disabled={workflow.step === 1 && !reading.ready} onClick={() => act("commit")}>Complete {DAILY_TASKS[workflow.step].toLowerCase()} →</button>}
        {committed && <div className="top-gap" role="status"><p className="saved-note">✓ {DAILY_TASKS[workflow.step]} committed.</p>
          {workflow.step === 5 && <><p className="meta">Check for unexplained terms, missing causal steps, weak examples and unsupported claims. Compare with the source before rewriting.</p><AIFeedbackPanel context={`Book: ${book.title}; location: ${d.location}; source evidence: ${d.evidence}; principle: ${d.principle}; boundaries: ${d.boundaries}; ${categoryLens(book.category ?? "general")}`} instruction={`Give specific feedback on accuracy against the supplied source evidence, plain language, causal reasoning, examples and boundaries for audience ${d.audience} and purpose ${d.purpose}. Identify uncertainty. Do not invent source details or give a mastery score.`} userResponse={d.explanation} /></>}
          <button className="small-btn primary top-gap" onClick={() => act("advance")}>{workflow.step === 6 || workflow.kind === "outcome-review" ? "Finish daily workflow →" : `Continue to ${DAILY_TASKS[workflow.step + 1].toLowerCase()} →`}</button>
        </div>}
      </>}
      {message && <p className="meta top-gap" role="status">{message}</p>}
      {(workflow.step === 3 || workflow.step === 6) && <details className="top-gap"><summary>Check source notes</summary>{getHighlightsForSource(id).map(note => <div className="note-item" key={note.id}><span className="kicker">{note.location || book.title}</span><p>{note.text}</p></div>)}<p className="meta">Check the book itself if the needed passage is not in your notes.</p></details>}
      <details className="top-gap"><summary>Saved session work</summary>{Object.entries(d).filter(([key]) => workflow.finishedAt || (workflow.step !== 2 && workflow.step !== 5) || ["location", "audience", "purpose", "medium"].includes(key)).map(([key, value]) => <div className="note-item" key={key}><strong>{key}</strong><p style={{ whiteSpace: "pre-wrap" }}>{value}</p></div>)}</details>
    </>}
  </article>;
}
