"use client";

import { useState, useEffect } from "react";
import { getDueRetrievals, getDueCount, recordRetrievalScore, type RetrievalCard, type RetrievalQuality } from "@/lib/retrieval-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

type Phase = "idle" | "recall" | "revealed" | "done";

export function ReviewView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [queue, setQueue] = useState<RetrievalCard[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [response, setResponse] = useState("");
  const [scores, setScores] = useState<RetrievalQuality[]>([]);
  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    const due = getDueRetrievals(20);
    setQueue(due);
    setTotalDue(getDueCount());
    setPhase(due.length > 0 ? "recall" : "done");
  }, []);

  function score(quality: RetrievalQuality) {
    const card = queue[index];
    recordRetrievalScore(card.id, quality);
    if (quality !== "blank") {
      awardPoints("recall-check", `Reviewed: ${card.label}`, quality === "nailed" ? POINTS.recallCheck : Math.floor(POINTS.recallCheck / 2));
    }
    window.dispatchEvent(new Event("alexandria:data"));
    const newScores = [...scores, quality];
    setScores(newScores);
    if (index + 1 >= queue.length) {
      setPhase("done");
    } else {
      setIndex(index + 1);
      setResponse("");
      setPhase("recall");
    }
  }

  const card = queue[index];
  const nailed = scores.filter((s) => s === "nailed").length;
  const partial = scores.filter((s) => s === "partial").length;
  const blank = scores.filter((s) => s === "blank").length;

  if (phase === "done" && queue.length === 0) {
    return (
      <section className="view active">
        <div className="content">
          <div className="eyebrow">Review</div>
          <h1 className="page-title">Up to date</h1>
          <article className="card review-empty">
            <p className="review-empty-icon">✓</p>
            <h2>Nothing due for review</h2>
            <p>Your next review will be scheduled automatically based on how well you recalled each concept. Check back tomorrow.</p>
            <p className="meta">Due count resets at midnight. Add more books, highlights, or captures to grow your review queue.</p>
            <button className="small-btn primary" onClick={() => navigate("library")}>Add a book</button>
          </article>
        </div>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section className="view active">
        <div className="content">
          <div className="eyebrow">Review · session complete</div>
          <h1 className="page-title">Session complete</h1>
          <article className="card review-result">
            <div className="result-stats">
              <div className="result-stat good"><b>{nailed}</b><span>Nailed it</span></div>
              <div className="result-stat partial"><b>{partial}</b><span>Partial</span></div>
              <div className="result-stat miss"><b>{blank}</b><span>Blank</span></div>
            </div>
            <p className="review-summary">
              {nailed > partial + blank
                ? "Strong session. These concepts are moving into long-term memory."
                : blank > nailed
                ? "Gaps identified. The blanks will resurface sooner — that's intentional."
                : "Mixed results. Spaced repetition will adjust the schedule automatically."}
            </p>
            <div className="button-row">
              <button className="small-btn" onClick={() => navigate("home")}>Back to Home</button>
              <button className="small-btn primary" onClick={() => navigate("library")}>Go to Library</button>
            </div>
          </article>
        </div>
      </section>
    );
  }

  if (!card) return null;

  return (
    <section className="view active">
      <div className="content">
        <div className="section-tools">
          <div className="eyebrow">Review · {index + 1} of {queue.length}</div>
          <div className="review-progress-bar"><span style={{ width: `${(index / queue.length) * 100}%` }} /></div>
        </div>

        <article className="card review-card">
          <div className="review-source">
            <span className="pill">{card.refType}</span>
            <span className="meta">{card.label}</span>
            {card.reviewCount > 0 && <span className="meta">reviewed {card.reviewCount}×</span>}
          </div>

          {phase === "recall" && (
            <div className="recall-phase">
              <p className="review-prompt">Without looking it up: what do you remember about this?</p>
              <div className="review-blur-hint">The original text is hidden. Recall first, then reveal.</div>
              <textarea
                className="recall-input"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write what you remember, in your own words…"
                autoFocus
              />
              <div className="button-row">
                <button className="small-btn" onClick={() => { setPhase("revealed"); }}>I can't recall — show me</button>
                <button className="small-btn primary" disabled={!response.trim()} onClick={() => setPhase("revealed")}>Reveal and compare</button>
              </div>
            </div>
          )}

          {phase === "revealed" && (
            <div className="reveal-phase">
              {response && (
                <div className="your-recall">
                  <div className="recall-label">Your recall</div>
                  <p>{response}</p>
                </div>
              )}
              <div className="original-text">
                <div className="recall-label">Original</div>
                <blockquote>{card.text}</blockquote>
              </div>
              <p className="score-prompt">How well did you recall it?</p>
              <div className="score-row">
                <button className="score-btn miss" onClick={() => score("blank")}>Blank<span>Couldn't recall</span></button>
                <button className="score-btn partial" onClick={() => score("partial")}>Partial<span>Got the gist</span></button>
                <button className="score-btn good" onClick={() => score("nailed")}>Nailed it<span>Clear and accurate</span></button>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
