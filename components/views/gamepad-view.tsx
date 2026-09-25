"use client";

import { useEffect, useState } from "react";
import { getDueRetrievals, recordRetrievalScore, type RetrievalCard, type RetrievalQuality } from "@/lib/retrieval-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import { getArcadeProgress } from "@/lib/arcade-store";
import { RecallRally } from "@/components/recall-rally";

type GameMode = "menu" | "quiz" | "quiz-result" | "rally";

interface QuizState {
  cards: RetrievalCard[];
  index: number;
  revealed: boolean;
  scores: RetrievalQuality[];
  response: string;
}

const QUIZ_SIZE = 5;

export function GamePadView() {
  const [mode, setMode] = useState<GameMode>("menu");
  const [dueCount, setDueCount] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>({ cards: [], index: 0, revealed: false, scores: [], response: "" });
  const [arcade, setArcade] = useState(() => getArcadeProgress());

  useEffect(() => {
    const refresh = () => {
      setDueCount(getDueRetrievals(1).length > 0 ? getDueRetrievals(100).length : 0);
      setArcade(getArcadeProgress());
    };
    refresh();
    window.addEventListener("alexandria:data", refresh);
    return () => window.removeEventListener("alexandria:data", refresh);
  }, []);

  function startQuiz() {
    const cards = getDueRetrievals(QUIZ_SIZE);
    if (cards.length === 0) return;
    setQuiz({ cards, index: 0, revealed: false, scores: [], response: "" });
    setMode("quiz");
  }

  function revealCard() {
    setQuiz((q) => ({ ...q, revealed: true }));
  }

  function scoreCard(quality: RetrievalQuality) {
    const card = quiz.cards[quiz.index];
    recordRetrievalScore(card.id, quality);
    if (quality !== "blank") {
      awardPoints("recall-check", `Daily challenge: ${card.label}`, quality === "nailed" ? POINTS.recallCheck : Math.floor(POINTS.recallCheck / 2));
    }
    window.dispatchEvent(new Event("alexandria:data"));
    const newScores = [...quiz.scores, quality];
    if (quiz.index + 1 >= quiz.cards.length) {
      setQuiz((q) => ({ ...q, scores: newScores, revealed: false }));
      setMode("quiz-result");
    } else {
      setQuiz((q) => ({ ...q, index: q.index + 1, revealed: false, scores: newScores, response: "" }));
    }
  }

  const nailed = quiz.scores.filter((s) => s === "nailed").length;
  const partial = quiz.scores.filter((s) => s === "partial").length;
  const blank = quiz.scores.filter((s) => s === "blank").length;
  const card = quiz.cards[quiz.index];

  if (mode === "rally") return <RecallRally onExit={() => setMode("menu")} />;

  if (mode === "quiz" && card) {
    return (
      <section className="view active">
        <div className="content">
          <button className="ghost-btn back-btn" onClick={() => setMode("menu")}>← Exit</button>
          <div className="eyebrow">Daily Challenge · {quiz.index + 1} of {quiz.cards.length}</div>

          <div className="quiz-progress-row">
            {quiz.cards.map((_, i) => (
              <span key={i} className={`quiz-dot${i < quiz.index ? " done" : i === quiz.index ? " active" : ""}`} />
            ))}
          </div>

          <article className="card review-card quiz-card">
            <div className="review-source">
              <span className="pill">{card.refType}</span>
              <span className="meta">{card.label}</span>
            </div>

            {!quiz.revealed ? (
              <div className="recall-phase">
                <p className="review-prompt">What do you remember?</p>
                <textarea
                  className="recall-input"
                  value={quiz.response}
                  onChange={(e) => setQuiz((q) => ({ ...q, response: e.target.value }))}
                  placeholder="Recall from memory…"
                  autoFocus
                />
                <div className="button-row">
                  <button className="small-btn" onClick={revealCard}>Show answer</button>
                  <button className="small-btn primary" onClick={revealCard}>Reveal and score</button>
                </div>
              </div>
            ) : (
              <div className="reveal-phase">
                {quiz.response && (
                  <div className="your-recall">
                    <div className="recall-label">Your answer</div>
                    <p>{quiz.response}</p>
                  </div>
                )}
                <div className="original-text">
                  <div className="recall-label">Original</div>
                  <blockquote>{card.text}</blockquote>
                </div>
                <div className="score-row">
                  <button className="score-btn miss" onClick={() => scoreCard("blank")}>Blank<span>Couldn't recall</span></button>
                  <button className="score-btn partial" onClick={() => scoreCard("partial")}>Partial<span>Got the gist</span></button>
                  <button className="score-btn good" onClick={() => scoreCard("nailed")}>Nailed it<span>Clear recall</span></button>
                </div>
              </div>
            )}
          </article>
        </div>
      </section>
    );
  }

  if (mode === "quiz-result") {
    return (
      <section className="view active">
        <div className="content">
          <div className="eyebrow">Daily Challenge · Complete</div>
          <h1 className="page-title">Session complete</h1>
          <article className="card review-result">
            <div className="result-stats">
              <div className="result-stat good"><b>{nailed}</b><span>Nailed it</span></div>
              <div className="result-stat partial"><b>{partial}</b><span>Partial</span></div>
              <div className="result-stat miss"><b>{blank}</b><span>Blank</span></div>
            </div>
            <p className="review-summary">
              {nailed >= quiz.cards.length * 0.8
                ? "Excellent recall. These concepts are consolidating well."
                : blank > nailed
                ? "Several gaps. The blank cards will resurface sooner — that's how the system works."
                : "Good effort. Keep showing up daily for compounding results."}
            </p>
            <div className="button-row">
              <button className="small-btn" onClick={() => setMode("menu")}>Back to Game Pad</button>
              {dueCount > quiz.cards.length && (
                <button className="small-btn primary" onClick={startQuiz}>Another round</button>
              )}
            </div>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="content">
        <div className="eyebrow">Track</div>
        <h1 className="page-title">Game Pad</h1>
        <p className="page-intro">Train your recall through play. Every game draws on concepts you're actually learning.</p>

        <div className="gamepad-grid">
          <article className={`card game-card${dueCount > 0 ? " available" : " locked"}`} onClick={dueCount > 0 ? startQuiz : undefined}>
            <div className="game-icon">🃏</div>
            <div>
              <h3>Daily Challenge</h3>
              <p>{dueCount > 0 ? `${Math.min(dueCount, QUIZ_SIZE)} cards due — test your recall` : "No cards due today. Come back tomorrow."}</p>
            </div>
            {dueCount > 0 && <button className="small-btn primary" onClick={startQuiz}>Start →</button>}
          </article>

          {(() => {
            const rally = arcade.unlocks.find((u) => u.id === "rally")!;
            return <article className={`card game-card${rally.unlocked ? " available" : " locked"}`} onClick={rally.unlocked ? () => setMode("rally") : undefined}>
              <div className="game-icon">🏓</div>
              <div>
                <h3>Recall Rally</h3>
                <p>{rally.unlocked ? "Playable now. Beat Alexandria at Pong, then retrieve knowledge to earn each point." : rally.requirement}</p>
                {!rally.unlocked && <span className="coming-soon-badge">{Math.min(rally.current, rally.target)} / {rally.target} knowledge items</span>}
              </div>
              {rally.unlocked && <button className="small-btn primary" onClick={() => setMode("rally")}>Play →</button>}
            </article>;
          })()}

          {(() => {
            const tower = arcade.unlocks.find((u) => u.id === "tower")!;
            return <article className="card game-card locked">
              <div className="game-icon">🏰</div>
              <div>
                <h3>The Tower</h3>
                <p>{tower.requirement}</p>
                <span className="coming-soon-badge">{tower.unlocked ? "Unlocked · mode in development" : "Locked"}</span>
              </div>
            </article>;
          })()}

          {(() => {
            const sprint = arcade.unlocks.find((u) => u.id === "sprint")!;
            return <article className="card game-card locked">
              <div className="game-icon">⚡</div>
              <div>
                <h3>Sprint Mode</h3>
                <p>{sprint.requirement}</p>
                <span className="coming-soon-badge">{sprint.unlocked ? "Unlocked · mode in development" : `${Math.min(sprint.current, sprint.target)} / ${sprint.target} knowledge items`}</span>
              </div>
            </article>;
          })()}
        </div>

        <article className="card top-gap">
          <div className="kicker">Achievements</div>
          <div className="achievement-grid">
            {arcade.achievements.map((a) => <div key={a.id} className={`achievement${a.unlocked ? " unlocked" : ""}`}>
              <strong>{a.unlocked ? "◆" : "◇"} {a.name}</strong>
              <span>{a.description}</span>
            </div>)}
          </div>
        </article>

        {dueCount === 0 && (
          <div className="empty-state" style={{ marginTop: 32 }}>
            <div className="empty-icon">🎮</div>
            <h3>Build your deck first</h3>
            <p>The Game Pad uses concepts from your Library. Add books, capture highlights, and complete Learn sessions to populate your review deck.</p>
          </div>
        )}
      </div>
    </section>
  );
}
