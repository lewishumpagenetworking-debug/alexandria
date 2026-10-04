"use client";

import { useEffect, useState } from "react";
import { type RetrievalQuality } from "@/lib/retrieval-store";
import { buildKnowledgeChallengeForUnit, recordSculptorChallengeResult, type SculptorChallenge } from "@/lib/sculptor-challenge-engine";
import { getKnowledgeUnitCard, listKnowledgeUnits } from "@/lib/knowledge-unit-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import { getArcadeProgress } from "@/lib/arcade-store";
import { RecallRally } from "@/components/recall-rally";
import { SourceReference } from "@/components/source-reference";
import { BookMemoryPrimer } from "@/components/book-memory-primer";
import { loadBooks } from "@/lib/application-store";
import {
  addMemorySessionActiveSeconds,
  buildMemoryDeck,
  completeMemorySession,
  getDailyMemoryPlan,
  getMemoryContexts,
  getTodayMemorySession,
  isTodayMemoryComplete,
  listMemorySessions,
  memorySessionElapsedSeconds,
  memorySessionRemainingSeconds,
  MIN_DAILY_REVIEWS,
  recordMemorySessionReview,
  startMemorySession,
  type DailyMemoryPlan,
  type MemoryDirection,
  type MemorySession,
} from "@/lib/memory-engine";

type GameMode = "menu" | "quiz" | "quiz-result" | "rally";
type ScopeChoice = "adaptive" | "all" | "book" | "context";
type DirectionChoice = "auto" | MemoryDirection;

interface QuizState {
  challenges: SculptorChallenge[];
  index: number;
  revealed: boolean;
  scores: RetrievalQuality[];
  response: string;
}

type DeckBook = { id: string; title: string; author: string; count: number };

function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function GamePadView() {
  const [mode, setMode] = useState<GameMode>("menu");
  const [quiz, setQuiz] = useState<QuizState>({ challenges: [], index: 0, revealed: false, scores: [], response: "" });
  const [arcade, setArcade] = useState(() => getArcadeProgress());
  const [deckBooks, setDeckBooks] = useState<DeckBook[]>([]);
  const [contexts, setContexts] = useState<Array<{ label: string; count: number }>>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [plan, setPlan] = useState<DailyMemoryPlan>(() => getDailyMemoryPlan());
  const [scopeChoice, setScopeChoice] = useState<ScopeChoice>("adaptive");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedContext, setSelectedContext] = useState("");
  const [directionChoice, setDirectionChoice] = useState<DirectionChoice>("auto");
  const [memorySession, setMemorySession] = useState<MemorySession | null>(() => getTodayMemorySession());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const units = listKnowledgeUnits();
      const books = loadBooks({ includeArchived: true, includeDeleted: false });
      const options = books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        count: units.filter((unit) => unit.sourceId === book.id).length,
      })).filter((book) => book.count > 0);
      const nextContexts = getMemoryContexts();
      setPoolCount(units.length);
      setDeckBooks(options);
      setContexts(nextContexts);
      setSelectedSourceId((current) => options.some((book) => book.id === current) ? current : options[0]?.id ?? "");
      setSelectedContext((current) => nextContexts.some((item) => item.label === current) ? current : nextContexts[0]?.label ?? "");
      setPlan(getDailyMemoryPlan());
      setMemorySession(getTodayMemorySession());
      setArcade(getArcadeProgress());
    };
    refresh();
    window.addEventListener("alexandria:data", refresh);
    return () => window.removeEventListener("alexandria:data", refresh);
  }, []);

  useEffect(() => {
    if (mode !== "quiz" || !memorySession || memorySession.completedAt) return;
    setElapsedSeconds(memorySessionElapsedSeconds(memorySession));
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsedSeconds((current) => {
        const next = current + 1;
        if (next % 5 === 0) {
          const updated = addMemorySessionActiveSeconds(memorySession.id, 5);
          if (updated) setMemorySession(updated);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, memorySession?.id, memorySession?.completedAt]);

  function resolvedDirection(): MemoryDirection {
    if (directionChoice !== "auto") return directionChoice;
    return scopeChoice === "adaptive" ? plan.direction : "forward";
  }

  function buildChallenges(): SculptorChallenge[] {
    const direction = resolvedDirection();
    const sourceId = scopeChoice === "book" ? selectedSourceId : undefined;
    const context = scopeChoice === "context" ? selectedContext : undefined;
    const units = buildMemoryDeck({
      sourceId,
      context,
      direction,
      adaptive: scopeChoice === "adaptive",
    }, 60);

    return units.flatMap((unit) => {
      const card = getKnowledgeUnitCard(unit);
      if (!card) return [];
      return [buildKnowledgeChallengeForUnit(unit, card, {
        allowedTypes: ["diagnosis"],
        difficulty: 2,
        reverse: direction === "reverse",
      })];
    });
  }

  function startQuiz() {
    const challenges = buildChallenges();
    if (challenges.length === 0) return;

    const selectedBook = deckBooks.find((book) => book.id === selectedSourceId);
    const direction = resolvedDirection();
    const session = startMemorySession(plan, scopeChoice === "adaptive" ? undefined : {
      scope: scopeChoice === "book" ? "book" : scopeChoice === "context" ? "context" : "mixed",
      sourceId: scopeChoice === "book" ? selectedSourceId : undefined,
      sourceTitle: scopeChoice === "book" ? selectedBook?.title : undefined,
      context: scopeChoice === "context" ? selectedContext : undefined,
      direction,
    });

    setMemorySession(session);
    setElapsedSeconds(0);
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
      awardPoints("recall-check", `Memory retrieval: ${card.label}`, quality === "nailed" ? POINTS.recallCheck : Math.floor(POINTS.recallCheck / 2));
    }

    const updatedSession = memorySession ? recordMemorySessionReview(memorySession.id, quality) : null;
    if (updatedSession) setMemorySession(updatedSession);
    window.dispatchEvent(new Event("alexandria:data"));

    const newScores = [...quiz.scores, quality];
    const candidateSession = updatedSession ?? memorySession;
    const alreadyCompletedAnotherSession = Boolean(candidateSession && listMemorySessions().some((session) =>
      session.date === candidateSession.date && session.id !== candidateSession.id && session.completedAt
    ));

    if (candidateSession && memorySessionRemainingSeconds(candidateSession) === 0 && candidateSession.reviewed >= MIN_DAILY_REVIEWS) {
      const result = completeMemorySession(candidateSession.id);
      if (result.completed && result.session && !candidateSession.completedAt && !alreadyCompletedAnotherSession) {
        awardPoints("memory-session", "Completed the daily memory session", POINTS.memorySessionComplete);
      }
      setMemorySession(result.session);
      setQuiz((q) => ({ ...q, scores: newScores, revealed: false }));
      setMode("quiz-result");
      return;
    }

    if (quiz.index + 1 >= quiz.challenges.length) {
      const nextDeck = buildChallenges();
      setQuiz({ challenges: nextDeck.length ? nextDeck : quiz.challenges, index: 0, revealed: false, scores: newScores, response: "" });
      return;
    }

    setQuiz((q) => ({ ...q, index: q.index + 1, revealed: false, scores: newScores, response: "" }));
  }

  const nailed = quiz.scores.filter((s) => s === "nailed").length;
  const partial = quiz.scores.filter((s) => s === "partial").length;
  const blank = quiz.scores.filter((s) => s === "blank").length;
  const challenge = quiz.challenges[quiz.index];
  const card = challenge?.card;
  const dailyComplete = isTodayMemoryComplete();
  const targetSeconds = (memorySession?.targetMinutes ?? plan.targetMinutes) * 60;
  const remainingSeconds = memorySession ? Math.max(0, targetSeconds - elapsedSeconds) : plan.targetMinutes * 60;
  const reviewed = memorySession?.reviewed ?? 0;

  if (mode === "rally") return <RecallRally onExit={() => setMode("menu")} />;

  if (mode === "quiz" && card && challenge) {
    return (
      <section className="view active">
        <div className="content">
          <button className="ghost-btn back-btn" onClick={() => setMode("menu")}>← Exit session</button>

          <div className="memory-session-header">
            <div>
              <div className="eyebrow">Daily memory session · {memorySession?.direction === "reverse" ? "reverse retrieval" : "forward retrieval"}</div>
              <h1 className="page-title">{formatClock(elapsedSeconds)} <span>/ {formatClock(targetSeconds)}</span></h1>
              <p className="meta">{reviewed} cards retrieved · minimum {MIN_DAILY_REVIEWS} · completion points unlock after the time target and minimum reviews are both met.</p>
            </div>
            <div className="memory-time-ring" aria-label={`${formatClock(remainingSeconds)} remaining`}>
              <strong>{formatClock(remainingSeconds)}</strong>
              <span>remaining</span>
            </div>
          </div>

          <div className="review-progress-bar memory-time-bar">
            <span style={{ width: `${Math.min(100, (elapsedSeconds / Math.max(1, targetSeconds)) * 100)}%` }} />
          </div>

          <article className="card review-card quiz-card">
            <div className="review-source">
              <span className="pill">{challenge.reverse ? "reverse" : card.refType}</span>
              <span className="meta">{challenge.unit.sourceTitle}</span>
              {challenge.unit.memoryType && <span className="pill small">{challenge.unit.memoryType}</span>}
              {(challenge.unit.contextTags ?? []).slice(0, 2).map((context) => <span className="pill small" key={context}>{context}</span>)}
            </div>

            <BookMemoryPrimer sourceId={challenge.unit.sourceId} />

            {challenge.reverse && !quiz.revealed ? (
              <SourceReference
                label={challenge.unit.maxim ? "Internal maxim" : challenge.unit.action ? "Action cue" : "Reverse cue"}
                text={challenge.cueText || challenge.unit.principle || challenge.unit.alexandriaDiagnosis || challenge.unit.quote}
                note="Do not try to reproduce exact wording. Recover the source idea, its meaning, and where it came from."
              />
            ) : (
              <SourceReference
                label={challenge.unit.sourceTitle}
                text={challenge.unit.quote}
                note={challenge.unit.location ? `${challenge.unit.location} · Reconstruct the meaning from the passage and book context.` : "Reconstruct the meaning from the passage and book context."}
              />
            )}

            {!quiz.revealed ? (
              <div className="recall-phase">
                <p className="review-prompt">{challenge.prompt}</p>
                <textarea
                  className="recall-input"
                  value={quiz.response}
                  onChange={(e) => setQuiz((q) => ({ ...q, response: e.target.value }))}
                  placeholder={challenge.reverse ? "Retrieve the source idea, meaning, and connection…" : "What is this really saying? Reconstruct the meaning in your own words…"}
                  autoFocus
                />
                <div className="button-row">
                  <button className="small-btn" onClick={revealCard}>Reveal answer</button>
                  <button className="small-btn primary" onClick={revealCard}>Commit retrieval →</button>
                </div>
              </div>
            ) : (
              <div className="reveal-phase">
                {quiz.response && (
                  <div className="your-recall">
                    <div className="recall-label">Your retrieval</div>
                    <p>{quiz.response}</p>
                  </div>
                )}

                {challenge.reverse && <div className="original-text">
                  <div className="recall-label">Original quote / note</div>
                  <blockquote>{challenge.unit.quote}</blockquote>
                  {challenge.unit.location && <p className="meta">{challenge.unit.location}</p>}
                </div>}

                <div className="original-text">
                  <div className="recall-label">Alexandria reference</div>
                  <blockquote>{challenge.reverse ? (challenge.unit.alexandriaDiagnosis || challenge.unit.principle || challenge.unit.maxim || challenge.unit.quote) : (challenge.expected || challenge.unit.alexandriaDiagnosis || challenge.unit.principle || challenge.unit.quote)}</blockquote>
                  <p className="meta">{challenge.guidance}</p>
                  {challenge.unit.maxim && <p><strong>Maxim:</strong> {challenge.unit.maxim}</p>}
                  {challenge.unit.action && <p><strong>Action:</strong> {challenge.unit.action}</p>}
                </div>

                <p className="score-prompt">Grade retrieval, not eloquence. Could you reconstruct the essential memory without leaning on the answer?</p>
                <div className="score-row">
                  <button className="score-btn miss" onClick={() => scoreCard("blank")}>Miss<span>Meaning unavailable or wrong</span></button>
                  <button className="score-btn partial" onClick={() => scoreCard("partial")}>Partial<span>Core idea incomplete</span></button>
                  <button className="score-btn good" onClick={() => scoreCard("nailed")}>Nailed<span>Essential memory retrieved</span></button>
                </div>
              </div>
            )}
          </article>
        </div>
      </section>
    );
  }

  if (mode === "quiz-result") {
    const accuracy = quiz.scores.length ? Math.round((nailed + partial * .5) / quiz.scores.length * 100) : 0;
    return (
      <section className="view active">
        <div className="content">
          <div className="eyebrow">Daily memory session · complete</div>
          <h1 className="page-title">Retention block complete</h1>
          <article className="card review-result">
            <div className="result-stats">
              <div className="result-stat good"><b>{nailed}</b><span>Nailed</span></div>
              <div className="result-stat partial"><b>{partial}</b><span>Partial</span></div>
              <div className="result-stat miss"><b>{blank}</b><span>Missed</span></div>
            </div>
            <p className="review-summary">{accuracy}% weighted retrieval accuracy across {quiz.scores.length} cards. Misses and partials now return sooner; stable memories expand their interval.</p>
            <p className="saved-note">Daily completion points are awarded once per day; card-level retrieval points continue on any extra blocks.</p>
            <div className="button-row">
              <button className="small-btn" onClick={() => setMode("menu")}>Back to Game Pad</button>
              {poolCount > 0 && <button className="small-btn primary" onClick={startQuiz}>Start an extra memory block</button>}
            </div>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="content">
        <div className="eyebrow">Memory training</div>
        <h1 className="page-title">Game Pad</h1>
        <p className="page-intro">The daily priority is a retrieval block designed to preserve the books, maxims, contexts, and actions you want available on command.</p>

        <article className={`card memory-plan-card${dailyComplete ? " complete" : ""}`}>
          <div className="memory-plan-top">
            <div>
              <div className="kicker">Today's adaptive memory loop</div>
              <h2>{dailyComplete ? "Daily memory target completed" : `${plan.targetMinutes}-minute retrieval block`}</h2>
              <p>{plan.reason}</p>
            </div>
            <div className="memory-plan-score">
              <strong>{dailyComplete ? "✓" : plan.targetMinutes}</strong>
              <span>{dailyComplete ? "complete" : "minutes"}</span>
            </div>
          </div>

          <div className="memory-plan-tags">
            <span className="pill active">{plan.scope === "book" ? "Book focus" : plan.scope === "context" ? "Context focus" : "Mixed Library"}</span>
            <span className="pill">{plan.direction === "reverse" ? "Reverse retrieval" : "Forward retrieval"}</span>
            {plan.focusBookTitle && <span className="pill">{plan.focusBookTitle}</span>}
            {plan.focusContext && <span className="pill">{plan.focusContext}</span>}
            {plan.intensive && <span className="pill">Intensive relearning</span>}
          </div>

          {poolCount > 0 && <div className="memory-override-grid">
            <label>Deck
              <select value={scopeChoice} onChange={(event) => setScopeChoice(event.target.value as ScopeChoice)}>
                <option value="adaptive">Alexandria chooses today</option>
                <option value="all">Entire Library</option>
                <option value="book">Specific book</option>
                <option value="context">Specific context</option>
              </select>
            </label>

            {scopeChoice === "book" && <label>Book
              <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
                {deckBooks.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.count} notes</option>)}
              </select>
            </label>}

            {scopeChoice === "context" && <label>Context
              <select value={selectedContext} onChange={(event) => setSelectedContext(event.target.value)}>
                {contexts.map((context) => <option key={context.label} value={context.label}>{context.label} · {context.count} notes</option>)}
              </select>
            </label>}

            <label>Direction
              <select value={directionChoice} onChange={(event) => setDirectionChoice(event.target.value as DirectionChoice)}>
                <option value="auto">Adaptive</option>
                <option value="forward">Quote → meaning</option>
                <option value="reverse">Maxim / action → source idea</option>
              </select>
            </label>

            <button className="small-btn primary" onClick={startQuiz}>{dailyComplete ? "Start extra memory block" : "Begin today's memory block"} →</button>
          </div>}

          {poolCount === 0 && <p className="meta">Import at least one note to build the memory loop.</p>}
          <p className="meta">You can override Alexandria's chosen deck at any time. The completion criterion is the memory work itself, not obedience to a particular book.</p>
        </article>

        <div className="rally-best-strip top-gap">
          <div><strong>{arcade.rallyBest.level}</strong><span>best Rally level</span></div>
          <div><strong>{arcade.rallyBest.combo}</strong><span>best knowledge combo</span></div>
          <div><strong>{arcade.rallyBest.accuracy}%</strong><span>average Rally accuracy</span></div>
          <div><strong>{arcade.rallyBest.runs}</strong><span>Rally runs</span></div>
        </div>

        <div className="gamepad-grid top-gap">
          {(() => {
            const rally = arcade.unlocks.find((u) => u.id === "rally")!;
            return <article className={`card game-card${rally.unlocked ? " available" : " locked"}`} onClick={rally.unlocked ? () => setMode("rally") : undefined}>
              <div className="game-icon">🏓</div>
              <div>
                <h3>Recall Rally</h3>
                <p>{rally.unlocked ? "Optional retrieval through play after the priority memory block." : rally.requirement}</p>
                {!rally.unlocked && <span className="coming-soon-badge">{Math.min(rally.current, rally.target)} / {rally.target} knowledge items</span>}
              </div>
              {rally.unlocked && <button className="small-btn primary" onClick={() => setMode("rally")}>Play →</button>}
            </article>;
          })()}

          {(() => {
            const tower = arcade.unlocks.find((u) => u.id === "tower")!;
            return <article className="card game-card locked">
              <div className="game-icon">🏰</div>
              <div><h3>The Tower</h3><p>{tower.requirement}</p><span className="coming-soon-badge">{tower.unlocked ? "Unlocked · mode in development" : "Locked"}</span></div>
            </article>;
          })()}

          {(() => {
            const sprint = arcade.unlocks.find((u) => u.id === "sprint")!;
            return <article className="card game-card locked">
              <div className="game-icon">⚡</div>
              <div><h3>Sprint Mode</h3><p>{sprint.requirement}</p><span className="coming-soon-badge">{sprint.unlocked ? "Unlocked · mode in development" : `${Math.min(sprint.current, sprint.target)} / ${sprint.target} knowledge items`}</span></div>
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

        {poolCount === 0 && <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-icon">🧠</div>
          <h3>Build the memory library first</h3>
          <p>Import book notes and Alexandria will schedule them into focused, mixed, and reverse retrieval loops.</p>
        </div>}
      </div>
    </section>
  );
}
