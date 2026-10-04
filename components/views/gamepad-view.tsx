"use client";

import { useEffect, useState } from "react";
import { type RetrievalQuality } from "@/lib/retrieval-store";
import { getKnowledgeChallenge, getKnowledgeChallengeDeck, recordSculptorChallengeResult, type SculptorChallenge } from "@/lib/sculptor-challenge-engine";
import { awardPoints, POINTS } from "@/lib/points-store";
import { getArcadeProgress } from "@/lib/arcade-store";
import { RecallRally } from "@/components/recall-rally";
import { SourceReference } from "@/components/source-reference";
import { BookMemoryPrimer } from "@/components/book-memory-primer";
import { loadBooks } from "@/lib/application-store";

type GameMode = "menu" | "quiz" | "quiz-result" | "rally";

interface QuizState {
  challenges: SculptorChallenge[];
  index: number;
  revealed: boolean;
  scores: RetrievalQuality[];
  response: string;
}

const DEFAULT_QUIZ_SIZE = 5;
type DeckBook = { id: string; title: string; author: string; count: number };

export function GamePadView() {
  const [mode, setMode] = useState<GameMode>("menu");
  const [quiz, setQuiz] = useState<QuizState>({ challenges: [], index: 0, revealed: false, scores: [], response: "" });
  const [arcade, setArcade] = useState(() => getArcadeProgress());
  const [deckBooks, setDeckBooks] = useState<DeckBook[]>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [selectedSourceId, setSelectedSourceId] = useState("all");
  const [sessionSize, setSessionSize] = useState(DEFAULT_QUIZ_SIZE);

  useEffect(() => {
    const refresh = () => {
      const units = getKnowledgeChallengeDeck();
      const books = loadBooks({ includeArchived: true, includeDeleted: false });
      const options = books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        count: units.filter((unit) => unit.sourceId === book.id).length,
      })).filter((book) => book.count > 0);
      setPoolCount(units.length);
      setDeckBooks(options);
      setSelectedSourceId((current) => current === "all" || options.some((book) => book.id === current) ? current : "all");
      setArcade(getArcadeProgress());
    };
    refresh();
    window.addEventListener("alexandria:data", refresh);
    return () => window.removeEventListener("alexandria:data", refresh);
  }, []);

  function startQuiz() {
    const challenges: SculptorChallenge[] = [];
    const excluded = new Set<string>();
    for (let i = 0; i < sessionSize; i++) {
      const challenge = getKnowledgeChallenge({
        sourceId: selectedSourceId === "all" ? undefined : selectedSourceId,
        allowedTypes: ["diagnosis"],
        difficulty: 2,
        excludeUnitIds: excluded,
        dueOnly: false,
        selectionMode: "shuffle",
      });
      if (!challenge) break;
      challenges.push(challenge);
      excluded.add(challenge.unit.id);
    }
    if (challenges.length === 0) return;
    setQuiz({ challenges, index: 0, revealed: false, scores: [], response: "" });
    setMode("quiz");
  }

  function revealCard() {
    setQuiz((q) => ({ ...q, revealed: true }));
  }

  function scoreCard(quality: RetrievalQuality) {
    const challenge = quiz.challenges[quiz.index];
    if (!challenge) return;
    const card = challenge.card;
    recordSculptorChallengeResult(challenge, quiz.response, quality, "daily-challenge");
    if (quality !== "blank") {
      awardPoints("recall-check", `Daily challenge: ${card.label}`, quality === "nailed" ? POINTS.recallCheck : Math.floor(POINTS.recallCheck / 2));
    }
    window.dispatchEvent(new Event("alexandria:data"));
    const newScores = [...quiz.scores, quality];
    if (quiz.index + 1 >= quiz.challenges.length) {
      setQuiz((q) => ({ ...q, scores: newScores, revealed: false }));
      setMode("quiz-result");
    } else {
      setQuiz((q) => ({ ...q, index: q.index + 1, revealed: false, scores: newScores, response: "" }));
    }
  }

  const nailed = quiz.scores.filter((s) => s === "nailed").length;
  const partial = quiz.scores.filter((s) => s === "partial").length;
  const blank = quiz.scores.filter((s) => s === "blank").length;
  const challenge = quiz.challenges[quiz.index];
  const card = challenge?.card;

  if (mode === "rally") return <RecallRally onExit={() => setMode("menu")} />;

  if (mode === "quiz" && card && challenge) {
    return (
      <section className="view active">
        <div className="content">
          <button className="ghost-btn back-btn" onClick={() => setMode("menu")}>← Exit</button>
          <div className="eyebrow">Daily Challenge · shuffled deck · {quiz.index + 1} of {quiz.challenges.length}</div>

          <div className="quiz-progress-row">
            {quiz.challenges.map((_, i) => (
              <span key={i} className={`quiz-dot${i < quiz.index ? " done" : i === quiz.index ? " active" : ""}`} />
            ))}
          </div>

          <article className="card review-card quiz-card">
            <div className="review-source">
              <span className="pill">{card.refType}</span>
              <span className="meta">{card.label}</span>
            </div>

            <BookMemoryPrimer sourceId={challenge.unit.sourceId} />

            <SourceReference
              label={challenge.unit.sourceTitle}
              text={challenge.unit.quote}
              note={challenge.unit.location ? `${challenge.unit.location} · Reconstruct the meaning from the passage and the book context above.` : "Reconstruct the meaning from the passage and the book context above."}
            />

            {!quiz.revealed ? (
              <div className="recall-phase">
                <p className="review-prompt">{challenge.prompt}</p>
                <textarea
                  className="recall-input"
                  value={quiz.response}
                  onChange={(e) => setQuiz((q) => ({ ...q, response: e.target.value }))}
                  placeholder="What is this really saying? Reconstruct the meaning in your own words…"
                  autoFocus
                />
                <div className="button-row">
                  <button className="small-btn" onClick={revealCard}>Compare with source</button>
                  <button className="small-btn primary" onClick={revealCard}>Commit and score</button>
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
                  <div className="recall-label">Alexandria reference answer</div>
                  <blockquote>{challenge.expected || challenge.unit.alexandriaDiagnosis || challenge.unit.principle || challenge.unit.quote}</blockquote>
                  <p className="meta">{challenge.guidance}</p>
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
              {nailed >= quiz.challenges.length * 0.8
                ? "Excellent recall. These concepts are consolidating well."
                : blank > nailed
                ? "Several gaps. The blank cards will resurface sooner — that's how the system works."
                : "Good effort. Keep showing up daily for compounding results."}
            </p>
            <div className="button-row">
              <button className="small-btn" onClick={() => setMode("menu")}>Back to Game Pad</button>
              {poolCount > 0 && (
                <button className="small-btn primary" onClick={startQuiz}>Shuffle another round</button>
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
        <div className="rally-best-strip">
          <div><strong>{arcade.rallyBest.level}</strong><span>best Rally level</span></div>
          <div><strong>{arcade.rallyBest.combo}</strong><span>best knowledge combo</span></div>
          <div><strong>{arcade.rallyBest.accuracy}%</strong><span>average Rally accuracy</span></div>
          <div><strong>{arcade.rallyBest.runs}</strong><span>Rally runs</span></div>
        </div>

        <div className="gamepad-grid">
          <article className={`card game-card daily-deck-card${poolCount > 0 ? " available" : " locked"}`}>
            <div className="game-icon">🃏</div>
            <div className="daily-deck-body">
              <h3>Daily Challenge</h3>
              <p>Flashcard-style quote review. Every imported note stays eligible; choose the whole Library or one book, then shuffle.</p>
              {poolCount > 0 && <div className="daily-deck-controls">
                <label>Quote pool
                  <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
                    <option value="all">All books · {poolCount} notes</option>
                    {deckBooks.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.count} notes</option>)}
                  </select>
                </label>
                <div>
                  <span className="control-label">Cards this session</span>
                  <div className="constraint-row">
                    {[1, 5, 10].map((count) => <button type="button" key={count} className={`pill${sessionSize === count ? " active" : ""}`} onClick={() => setSessionSize(count)}>{count}</button>)}
                  </div>
                </div>
                <button className="small-btn primary" onClick={startQuiz}>Shuffle & begin →</button>
              </div>}
              {poolCount === 0 && <p className="meta">Import at least one note to build the deck.</p>}
            </div>
          </article>

          {(() => {
            const rally = arcade.unlocks.find((u) => u.id === "rally")!;
            return <article className={`card game-card${rally.unlocked ? " available" : " locked"}`} onClick={rally.unlocked ? () => setMode("rally") : undefined}>
              <div className="game-icon">🏓</div>
              <div>
                <h3>Recall Rally</h3>
                <p>{rally.unlocked ? "Classic Pong with Alexandria knowledge controlling the score. Choose one book or the whole Library, climb levels, build combos and surface weak concepts." : rally.requirement}</p>
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

        {poolCount === 0 && (
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
