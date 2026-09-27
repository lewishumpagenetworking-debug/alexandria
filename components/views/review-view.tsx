"use client";

import { useState, useEffect } from "react";
import { getDueRetrievals, getDueCount, recordRetrievalScore, type RetrievalCard, type RetrievalQuality } from "@/lib/retrieval-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";
import { SourceReference } from "@/components/source-reference";
import { getReviewEvidence } from "@/lib/review-evidence";

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
  const evidence = card ? getReviewEvidence(card) : null;
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
              <div className="result-stat good"><b>{nailed}</b><span>Exact</span></div>
              <div className="result-stat partial"><b>{partial}</b><span>Partial</span></div>
              <div className="result-stat miss"><b>{blank}</b><span>Nowhere near</span></div>
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

          <SourceReference
            label={card.label}
            text={card.text}
            note="First diagnose the quote yourself. Alexandria's interpretation and scholarly basis stay hidden until you commit."
          />

          {phase === "recall" && (
            <div className="recall-phase">
              <p className="review-prompt">What do you think this quote means? Diagnose the underlying idea, motive, assumption, or lesson in your own words.</p>
              <textarea
                className="recall-input"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Your diagnosis of the quote…"
                autoFocus
              />
              <div className="button-row">
                <button className="small-btn" onClick={() => { setResponse("(No diagnosis recorded)"); setPhase("revealed"); }}>Show Alexandria's diagnosis</button>
                <button className="small-btn primary" disabled={!response.trim()} onClick={() => setPhase("revealed")}>Commit my diagnosis →</button>
              </div>
            </div>
          )}

          {phase === "revealed" && evidence && (
            <div className="reveal-phase">
              <div className="your-recall">
                <div className="recall-label">Your diagnosis</div>
                <p>{response}</p>
              </div>

              <div className="review-diagnosis">
                <div className="recall-label">Alexandria's diagnosis</div>
                <p>{evidence.diagnosis}</p>
              </div>

              <div className="review-scholar">
                <div className="recall-label">Scholarly basis</div>
                {evidence.scholarName && evidence.scholarBasis ? <>
                  <p><strong>{evidence.scholarName}</strong> · {evidence.scholarConfidence === "direct" ? "directly relevant" : "contextual support"}</p>
                  <p>{evidence.scholarBasis}</p>
                  {evidence.scholarSourceTitle && <p className="meta">Source: {evidence.scholarSourceTitle}</p>}
                  {evidence.scholarSourceUrl && <a href={evidence.scholarSourceUrl} target="_blank" rel="noreferrer" className="action-link">Open scholarly source ↗</a>}
                </> : <p className="meta">No defensible external scholar mapping is stored for this quote yet. Alexandria is showing its diagnosis without pretending to have external authority behind it.</p>}
              </div>

              <p className="score-prompt">Compare your diagnosis with Alexandria's. How close were you?</p>
              <div className="score-row">
                <button className="score-btn miss" onClick={() => score("blank")}>Nowhere near<span>Core meaning was missed</span></button>
                <button className="score-btn partial" onClick={() => score("partial")}>Partial<span>Some important overlap</span></button>
                <button className="score-btn good" onClick={() => score("nailed")}>Exact<span>Same essential diagnosis</span></button>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
