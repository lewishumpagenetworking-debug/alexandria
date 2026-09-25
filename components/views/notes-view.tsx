"use client";

import { useEffect, useState } from "react";
import { listCaptures } from "@/lib/capture-store";
import { listHighlights, listPrinciples } from "@/lib/library-notes-store";
import type { CaptureDraft } from "@/models/domain";
import type { Highlight, Principle } from "@/models/domain";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

type Tab = "inbox" | "highlights" | "principles" | "questions";

export function NotesView({ onCapture }: { onCapture: () => void; navigate?: (s: AlexandriaSpace) => void }) {
  const [tab, setTab] = useState<Tab>("inbox");
  const [captures, setCaptures] = useState<CaptureDraft[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);

  function sync() {
    setCaptures(listCaptures());
    setHighlights(listHighlights());
    setPrinciples(listPrinciples());
  }

  useEffect(() => {
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("alexandria:data", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("alexandria:data", sync);
    };
  }, []);

  const questions = captures.filter((c) => c.type === "Question");
  const inbox = captures.filter((c) => c.type !== "Question");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "inbox", label: "Inbox", count: inbox.length },
    { id: "highlights", label: "Highlights", count: highlights.length },
    { id: "principles", label: "Principles", count: principles.length },
    { id: "questions", label: "Questions", count: questions.length },
  ];

  const EmptyState = ({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: React.ReactNode }) => (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {cta}
    </div>
  );

  function renderInbox() {
    if (inbox.length === 0) return (
      <EmptyState
        icon="💭"
        title="Your inbox is empty"
        body="Capture a thought, observation, or decision using the + button. Ideas saved here become the raw material for your reviews and principles."
        cta={<button className="small-btn primary" onClick={onCapture}>Capture an idea</button>}
      />
    );
    return (
      <div className="notes-list">
        {inbox.map((item) => (
          <article key={item.id} className="note-item">
            <div className="note-meta">
              <span className="pill small">{item.type}</span>
              {item.category && item.category !== "Unclassified" && <span className="meta">{item.category}</span>}
              {item.relatedBook && <span className="meta">· {item.relatedBook}</span>}
              <span className="meta">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
            </div>
            <p className="note-text">{item.text}</p>
          </article>
        ))}
      </div>
    );
  }

  function renderHighlights() {
    if (highlights.length === 0) return (
      <EmptyState
        icon="📌"
        title="No highlights yet"
        body="Highlights are passages you save from books — either manually from the Library or imported via the spreadsheet template. They feed your review queue automatically."
      />
    );
    return (
      <div className="notes-list">
        {highlights.map((h) => (
          <article key={h.id} className="note-item">
            <div className="note-meta">
              <span className="meta">{h.location || "no location"} · {new Date(h.capturedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            </div>
            <blockquote className="highlight-text">{h.text}</blockquote>
          </article>
        ))}
      </div>
    );
  }

  function renderPrinciples() {
    if (principles.length === 0) return (
      <EmptyState
        icon="⚖️"
        title="No principles yet"
        body="Principles are standalone truths you've extracted from your reading. They're created during the Learn sessions or imported via the spreadsheet template."
      />
    );
    return (
      <div className="notes-list">
        {principles.map((p) => (
          <article key={p.id} className="note-item principle-item">
            <p className="principle-statement">{p.statement}</p>
            {p.explanation && <p className="meta principle-explanation">{p.explanation}</p>}
            <div className="note-meta">
              <span className={`pill small state-${p.state}`}>{p.state}</span>
              <span className="meta">confidence {Math.round(p.confidence * 100)}%</span>
              {p.sourceIds.length > 0 && <span className="meta">· {p.sourceIds.length} source{p.sourceIds.length > 1 ? "s" : ""}</span>}
            </div>
          </article>
        ))}
      </div>
    );
  }

  function renderQuestions() {
    if (questions.length === 0) return (
      <EmptyState
        icon="❓"
        title="No questions captured"
        body="When you encounter something you don't understand or want to investigate, capture it as a Question. Unanswered questions are the engine of learning."
        cta={<button className="small-btn primary" onClick={onCapture}>Capture a question</button>}
      />
    );
    return (
      <div className="notes-list">
        {questions.map((item) => (
          <article key={item.id} className="note-item question-item">
            <p className="question-text">{item.text}</p>
            <div className="note-meta">
              {item.category && item.category !== "Unclassified" && <span className="meta">{item.category}</span>}
              <span className="meta">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <section className="view active">
      <div className="content">
        <div className="page-header-row">
          <div>
            <div className="eyebrow">Knowledge</div>
            <h1 className="page-title">Ideas &amp; Notes</h1>
            <p className="page-intro">Everything you've captured, highlighted, or extracted — organised for retrieval.</p>
          </div>
          <button className="small-btn primary" onClick={onCapture}>+ Capture idea</button>
        </div>

        <div className="tab-row">
          {tabs.map((t) => (
            <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label} {t.count > 0 && <span className="tab-count">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {tab === "inbox" && renderInbox()}
          {tab === "highlights" && renderHighlights()}
          {tab === "principles" && renderPrinciples()}
          {tab === "questions" && renderQuestions()}
        </div>
      </div>
    </section>
  );
}
