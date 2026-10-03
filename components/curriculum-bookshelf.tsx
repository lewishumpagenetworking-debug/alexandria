"use client";

import { useEffect, useState } from "react";
import { curriculumBookById, curriculumBooks, curriculumFocuses, type CurriculumFocusId } from "@/data/curriculum";
import { createBook, loadBooks } from "@/lib/application-store";
import { loadLearningCampaign, saveLearningCampaign } from "@/lib/curriculum-store";

export function CurriculumBookshelf() {
  const [focusId, setFocusId] = useState<CurriculumFocusId>(() => loadLearningCampaign()?.focusId ?? "consumer-psychology");
  const [campaign, setCampaign] = useState(loadLearningCampaign);
  const [message, setMessage] = useState("");
  const [libraryKeys, setLibraryKeys] = useState<Set<string>>(new Set());
  const focus = curriculumFocuses.find(item => item.id === focusId) ?? curriculumFocuses[0];
  const activeCapabilityId = campaign?.focusId === focus.id ? campaign.capabilityBookId : focus.capabilityBookIds[0];
  const activeLeaderId = campaign?.focusId === focus.id ? campaign.leaderBookId : focus.leaderBookId;
  const capability = curriculumBookById(activeCapabilityId);
  const leader = curriculumBookById(activeLeaderId);
  useEffect(() => {
    const sync = () => setLibraryKeys(new Set(loadBooks({ includeArchived: true, includeDeleted: true }).map(book => `${book.title}::${book.author}`.toLowerCase())));
    sync();
    window.addEventListener("alexandria:data", sync);
    return () => window.removeEventListener("alexandria:data", sync);
  }, []);

  function inLibrary(title?: string, author?: string) {
    if (!title || !author) return false;
    return libraryKeys.has(`${title}::${author}`.toLowerCase());
  }

  function addToLibrary(bookId: string) {
    const book = curriculumBookById(bookId);
    if (!book) return;
    if (inLibrary(book.title, book.author)) {
      setMessage(`${book.title} is already in your Library.`);
      return;
    }
    createBook({ title: book.title, author: book.author, category: book.category });
    setMessage(`${book.title} added to your Library.`);
  }

  function activate(capabilityBookId: string, leaderBookId: string) {
    saveLearningCampaign({ focusId: focus.id, capabilityBookId, leaderBookId, startedAt: new Date().toISOString() });
    setCampaign(loadLearningCampaign());
    setMessage("Dual-track campaign activated.");
  }

  return <section className="curriculum-shell top-gap">
    <article className="card curriculum-intro">
      <div className="kicker">Alexandria curriculum · dual-track learning</div>
      <h2>Repair the weakest capability while keeping a leader in progress.</h2>
      <p>Choose the skill that is currently constraining you. Alexandria surfaces the next capability books, pairs the track with a serious historical study, and gives you a synthesis question so the two domains reinforce rather than compete with each other.</p>
      <label className="top-gap">Current constraint
        <select value={focus.id} onChange={event => { setFocusId(event.target.value as CurriculumFocusId); setMessage(""); }}>
          {curriculumFocuses.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
        </select>
      </label>
      <div className="curriculum-diagnosis top-gap">
        <strong>{focus.label}</strong>
        <p>{focus.diagnosis}</p>
        <p className="meta">Target capability: {focus.outcome}</p>
      </div>
    </article>

    <div className="curriculum-grid top-gap">
      <article className="card">
        <div className="kicker">Track A · Capability</div>
        <h2>{capability?.title}</h2>
        <p className="meta">{capability?.author}</p>
        <p>{capability?.purpose}</p>
        <div className="button-row top-gap">
          {capability && <button className="small-btn primary" onClick={() => addToLibrary(capability.id)}>{inLibrary(capability.title, capability.author) ? "Already in Library" : "Add to Library"}</button>}
        </div>
        <div className="list top-gap">
          {focus.capabilityBookIds.map((id, index) => {
            const book = curriculumBookById(id);
            if (!book) return null;
            const selected = id === activeCapabilityId;
            return <button key={id} className={`list-item curriculum-book-row${selected ? " selected" : ""}`} onClick={() => {
              if (!leader) return;
              activate(id, leader.id);
            }}>
              <strong>{index + 1}. {book.title}</strong>
              <span>{book.author} · {book.purpose}</span>
            </button>;
          })}
        </div>
      </article>

      <article className="card">
        <div className="kicker">Track B · Leader / history</div>
        <h2>{leader?.title}</h2>
        <p className="meta">{leader?.author}</p>
        <p>{leader?.purpose}</p>
        <div className="button-row top-gap">
          {leader && <button className="small-btn primary" onClick={() => addToLibrary(leader.id)}>{inLibrary(leader.title, leader.author) ? "Already in Library" : "Add to Library"}</button>}
        </div>
        <p className="meta top-gap">Leader biographies remain continuous studies. They do not have to finish inside the seven-day capability-book cadence.</p>
      </article>
    </div>

    <article className="card top-gap">
      <div className="kicker">Weekly synthesis</div>
      <h2>Force transfer, not analogy.</h2>
      <p>{focus.synthesisPrompt}</p>
      <p className="meta">Alexandria should surface this question during review only after you have captured evidence from both tracks. The goal is to extract a transferable mechanism and explicitly state where the historical analogy breaks.</p>
      {capability && leader && <button className="small-btn primary top-gap" onClick={() => activate(capability.id, leader.id)}>Set this as the active campaign</button>}
      {message && <p className="saved-note top-gap" role="status">{message}</p>}
    </article>

    <details className="card top-gap">
      <summary>Browse the full embedded curriculum</summary>
      <div className="list top-gap">
        {curriculumBooks.map(book => <div className="list-item" key={book.id}>
          <strong>{book.title}</strong>
          <span>{book.author} · {book.role === "leader" ? "Leader / history" : curriculumFocuses.find(f => f.id === book.focusId)?.label ?? "Capability"} · {book.purpose}</span>
          <button className="small-btn" onClick={() => addToLibrary(book.id)}>{inLibrary(book.title, book.author) ? "In Library" : "Add"}</button>
        </div>)}
      </div>
    </details>
  </section>;
}
