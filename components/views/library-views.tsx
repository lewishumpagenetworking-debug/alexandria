"use client";

import { useState } from "react";
import { capabilityEvidence, currentBook, halls, sourceMetrics, sources } from "@/data/mock-data";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";
import { PageHeader, Rule } from "@/components/page-header";

export function AtriumView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [question, setQuestion] = useState("");
  const [showCounsel, setShowCounsel] = useState(false);
  return (
    <section className="view active">
      <div className="hero"><div className="seeker"><div className="eyebrow">The Atrium · Daily inquiry</div><h1>What are you seeking?</h1><p>Bring a decision, an uncertainty, or a question worth living with.</p>
        <form className="seek-box" onSubmit={(event) => { event.preventDefault(); if (question.trim()) setShowCounsel(true); }}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Your question" placeholder="What assumptions am I making about this decision?" /><button>Enter the Library</button></form>
        <div className="seek-hints">Try: “What have I learned about uncertainty?” or “What historical situations resemble this?”</div>
        <div className={`counsel${showCounsel ? " show" : ""}`}><strong>Before searching for an answer, clarify the question.</strong><p>Alexandria would retrieve related principles, revisions, and lived evidence here. For now: name the decision this question must improve, your current belief, and what would change it.</p></div>
      </div></div>
      <div className="content"><div className="atrium-grid"><div className="stack">
        <article className="card"><div className="card-head"><div><div className="kicker">Continue reading</div><h2>{currentBook.title}</h2></div><button className="ghost-btn" onClick={() => navigate("ledger")}>Open ledger</button></div><div className="book-row"><div className="book-cover">THE BEGINNING OF INFINITY</div><div><p className="meta">David Deutsch · Chapter 9 of 18</p><p>“Optimism” — explanations, error correction, and the reach of progress.</p><div className="progress"><span /></div><div className="meta">218 of 341 pages · 24 pages this week</div><button className="action-link">Resume at page 219 →</button></div></div></article>
        <article className="card"><div className="card-head"><div><div className="kicker">Awaiting interrogation · 4</div><h2>Ideas that have not earned their place yet</h2></div><button className="ghost-btn" onClick={() => navigate("interrogation")}>Enter chamber</button></div><div className="list"><div className="list-item"><strong>“The opposite of a good idea can also be a good idea.”</strong><span>From The Art of Contrary Thinking · captured yesterday</span></div><div className="list-item"><strong>Institutions remember what individuals forget.</strong><span>Personal observation · captured 3 days ago</span></div></div></article>
        <article className="card"><div className="card-head"><div><div className="kicker">Recently integrated</div><h2>Principles surviving contact with reality</h2></div></div><div className="list"><div className="list-item"><strong>Preserve optionality until information becomes decision-relevant.</strong><span>Applied 3 times · revised after pricing experiment</span></div><div className="list-item"><strong>Incentives reveal the actual system.</strong><span>Connected across Human Nature and Commerce & Creation</span></div></div></article>
      </div><div className="stack">
        <article className="card"><div className="kicker">Return to the Agora</div><h2>A trusted colleague challenges your strategy in public.</h2><p className="meta">Leadership · 2-minute response · paused</p><button className="small-btn primary" onClick={() => navigate("agora")}>Resume exercise</button></article>
        <article className="card"><div className="kicker">Enter the Forum</div><h2>Explain sunk costs to a founder who has spent three years building.</h2><p className="meta">Audience: intelligent non-expert · 60 seconds</p><button className="action-link" onClick={() => navigate("forum")}>Begin speaking →</button></article>
        <article className="card"><div className="kicker">Questions worth pursuing</div><div className="list"><div className="list-item"><strong>When does persistence become identity protection?</strong><span>Generated from work · 2 connections</span></div><div className="list-item"><strong>Which of my beliefs depend on stable institutions?</strong><span>From Strategy & Power · unresolved</span></div><div className="list-item"><strong>What is lost when every decision becomes measurable?</strong><span>From The Examined Life · unresolved</span></div></div></article>
        <article className="card"><p className="quote">“The aim is not to possess knowledge, but to be changed by it.”<cite>Alexandria principle</cite></p></article>
      </div></div></div>
    </section>
  );
}

export function LibraryView() {
  return <section className="view active"><div className="content"><PageHeader eyebrow="The external memory" title="The Library" intro="Sources are beginnings, not trophies. Follow an idea from encounter through challenge, application, and revision." />
    <div className="section-tools"><input className="search" placeholder="Search sources, principles, people, events…" aria-label="Search library" /><button className="pill active">All sources</button><button className="pill">Books</button><button className="pill">Experiences</button><button className="small-btn primary">＋ Add source</button></div>
    <div className="source-grid">{sources.map((source, index) => <article className="card source" key={source.id}><div><span className="type">{source.type} · {source.creator}</span><h3>{source.title}</h3><p>{source.description}</p></div><div><div className="meta">{sourceMetrics[index]}</div><div className="stages" title="Progress to integration">{Array.from({ length: 7 }, (_, stage) => <i key={stage} className={stage < [4, 3, 6][index] ? "done" : ""} />)}</div></div></article>)}<div className="empty"><strong>No experiments yet</strong>When a principle meets reality, record the method, result, and what changed.</div></div>
  </div></section>;
}

export function HallsView() {
  return <section className="view active"><div className="content"><PageHeader eyebrow="Connected disciplines" title="Halls of Knowledge" intro="A principle may enter through one hall and illuminate another. These are perspectives, never prisons." /><div className="hall-grid">{halls.map((hall) => <article className="card hall" data-roman={hall.roman} key={hall.id}><div className="count">{hall.count}</div><h3>{hall.title}</h3><p>{hall.description}</p></article>)}</div></div></section>;
}

export function LedgerView() {
  const rows = [["The Beginning of Infinity", "64%", "Interrogated", "Yesterday"], ["Other Minds", "100%", "Reduced", "8 days ago"], ["The Strategy of Conflict", "38%", "Understood", "12 days ago"], ["Meditations", "100%", "Tested", "1 month ago"]];
  return <section className="view active"><div className="content"><PageHeader eyebrow="Reading as acquisition" title="Reading Ledger" intro="Measure what reading produces: remembered explanations, challenged ideas, tested principles, and revised models." />
    <div className="ledger-top"><article className="card"><div className="card-head"><div><div className="kicker">This month</div><h2>Depth over completion</h2></div></div><div className="stat-row">{[["286", "pages read"], ["41", "highlights captured"], ["12", "interrogated"], ["4", "applied"]].map(([value, label]) => <div className="stat" key={label}><b>{value}</b><span>{label}</span></div>)}</div></article><article className="card"><div className="kicker">Reading consistency</div><h2>9 sessions in 14 days</h2><p className="meta">Next session · Tomorrow, 07:30 · 35 minutes</p><div className="progress"><span style={{ width: "71%" }} /></div><button className="small-btn primary">Log a session</button></article></div><Rule />
    <article className="card table-wrap"><table className="table"><thead><tr><th>Source</th><th>Progress</th><th>Learning state</th><th>Last read</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell} className={index === 2 ? "level" : ""}>{cell}</td>)}</tr>)}</tbody></table></article>
  </div></section>;
}

export function ScriptoriumView() {
  return <section className="view active"><div className="content"><PageHeader eyebrow="Knowledge entering Alexandria" title="The Scriptorium" intro="Capture first. Speak from memory. Structure and classification come after the thought has been preserved." />
    <div className="pipeline">{["Read", "Highlight", "Speak", "Interrogate", "Approve", "Library"].map((label, index) => <div className="pipe" key={label}><b>{["I", "II", "III", "IV", "V", "VI"][index]}</b>{label}</div>)}</div>
    <div className="forum-grid"><article className="card"><div className="kicker">Primary workflow</div><h2>Speak what survived</h2><p className="meta">Do not organise while thinking. Dictate the idea, what it means to you, and why it matters.</p><textarea className="answer" placeholder="What did you encounter—and what do you think it means?" /><button className="small-btn primary top-gap">Preserve for interrogation</button></article><article className="dropzone"><div className="kicker">Secondary infrastructure</div><h3>Bulk import existing notes</h3><p className="meta">Upload a completed Alexandria spreadsheet for validation and preview before anything enters the Library.</p><button className="small-btn">Download Excel template</button> <button className="small-btn primary">Choose file</button></article></div>
  </div></section>;
}

export function CapabilityView() {
  const groups = [
    ["Knowledge", "Recall · Comprehension · Synthesis", "knowledge"],
    ["Reason", "Logic · First principles · Counterargument", "reason"],
    ["Communication", "Clarity · Compression · Oratory", "communication"],
    ["Action & intellectual character", "Application · Revision · Uncertainty", "action"],
  ] as const;
  return <section className="view active"><div className="content"><PageHeader eyebrow="Evidence of practice" title="Academy · Capability Map" intro="This is not a personality score. It is a record of what you have practised, demonstrated, revised, and carried into action." /><div className="cap-grid">{groups.map(([label, title, capability]) => <article className="card cap-group" key={capability}><div className="kicker">{label}</div><h3>{title}</h3>{capabilityEvidence.filter((item) => item.capability === capability).map((item) => <div className="evidence" key={item.id}><div className="evidence-mark">{item.strength === "demonstrated" ? "◆" : "◇"}</div><p>{item.statement}<span>{item.provenance}</span></p></div>)}</article>)}</div></div></section>;
}
