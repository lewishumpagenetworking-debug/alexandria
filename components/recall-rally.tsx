"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadBooks } from "@/lib/application-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import { buildRallyChallenge, buildRallyDeck, chooseRallyCard, type RallyChallenge } from "@/lib/recall-rally-engine";
import { saveRecallRallyRun } from "@/lib/recall-rally-store";
import { recordRetrievalScore, recordKnowledgeEngagement, type RetrievalQuality } from "@/lib/retrieval-store";

type Phase = "setup" | "playing" | "challenge" | "level-complete" | "result";
type PowerUp = "shield" | "slow" | "double" | null;

const POINTS_TO_WIN = 5;
const MAX_LEVELS = 12;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function RecallRally({ onExit }: { onExit: () => void }) {
  const books = useMemo(() => loadBooks().filter((book) => buildRallyDeck(book.title).length > 0), []);
  const [sourceTitle, setSourceTitle] = useState("all");
  const [phase, setPhase] = useState<Phase>("setup");
  const [level, setLevel] = useState(1);
  const [player, setPlayer] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [challenge, setChallenge] = useState<RallyChallenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [powerUp, setPowerUp] = useState<PowerUp>(null);
  const [questions, setQuestions] = useState(0);
  const [nailed, setNailed] = useState(0);
  const [partial, setPartial] = useState(0);
  const [missed, setMissed] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [levelsWon, setLevelsWon] = useState(0);
  const [conceptsTested, setConceptsTested] = useState<string[]>([]);
  const [conceptsMissed, setConceptsMissed] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("Move the paddle. Break Alexandria's defence.");
  const [paused, setPaused] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const usedIdsRef = useRef<Set<string>>(new Set());
  const challengeIndexRef = useRef(0);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const ballStateRef = useRef({
    playerY: 142,
    cpuY: 142,
    bx: 320,
    by: 180,
    vx: 4.4,
    vy: 2.6,
    lastHit: "cpu" as "player" | "cpu",
    rally: 0,
  });

  const deck = useMemo(() => buildRallyDeck(sourceTitle), [sourceTitle]);

  function resetMatch(nextLevel = level) {
    setPlayer(0);
    setCpu(0);
    setCombo(0);
    setPowerUp(null);
    const s = ballStateRef.current;
    s.playerY = 142;
    s.cpuY = 142;
    s.bx = 320;
    s.by = 180;
    s.vx = 4.2 + nextLevel * 0.22;
    s.vy = 2.3 + nextLevel * 0.12;
    s.rally = 0;
  }

  function startRun() {
    usedIdsRef.current = new Set();
    challengeIndexRef.current = 0;
    startedAtRef.current = new Date().toISOString();
    setLevel(1);
    setLevelsWon(0);
    setQuestions(0);
    setNailed(0);
    setPartial(0);
    setMissed(0);
    setXpEarned(0);
    setBestCombo(0);
    setConceptsTested([]);
    setConceptsMissed([]);
    resetMatch(1);
    setStatusText("First to 5. A mechanical point only counts after a knowledge challenge.");
    setPhase("playing");
  }

  function endRun(finalPlayer = player, finalCpu = cpu) {
    saveRecallRallyRun({
      sourceTitle: sourceTitle === "all" ? "All Library" : sourceTitle,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      levelReached: level,
      levelsWon,
      playerPoints: finalPlayer,
      cpuPoints: finalCpu,
      questions,
      nailed,
      partial,
      missed,
      bestCombo,
      xpEarned,
      conceptsTested,
      conceptsMissed,
    });
    setPhase("result");
  }

  function triggerKnowledgeChallenge() {
    const card = chooseRallyCard(deck, level, usedIdsRef.current);
    if (!card) {
      setStatusText("No reviewable knowledge is available in this deck.");
      setPhase("result");
      return;
    }
    usedIdsRef.current.add(card.id);
    const built = buildRallyChallenge(card, level, challengeIndexRef.current++);
    setChallenge(built);
    if (powerUp === "slow") setPowerUp(null);
    setAnswer("");
    setRevealed(false);
    setPhase("challenge");
  }

  useEffect(() => {
    if (phase !== "playing" || paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resetBall = (direction: 1 | -1) => {
      const s = ballStateRef.current;
      s.bx = canvas.width / 2;
      s.by = canvas.height / 2;
      const speed = 4.2 + level * 0.22 + Math.min(2.2, s.rally * 0.04);
      s.vx = speed * direction;
      s.vy = (Math.random() > 0.5 ? 1 : -1) * (2.2 + level * 0.12 + Math.random() * 1.8);
      s.rally = 0;
    };

    const loop = () => {
      const s = ballStateRef.current;
      const slowFactor = powerUp === "slow" ? 0.72 : 1;
      s.bx += s.vx * slowFactor;
      s.by += s.vy * slowFactor;

      if (s.by <= 7 || s.by >= canvas.height - 7) {
        s.vy *= -1;
        s.by = clamp(s.by, 7, canvas.height - 7);
      }

      const aiSpeed = 2.7 + level * 0.24;
      const prediction = s.by + (s.vx > 0 ? s.vy * 3 : 0);
      const cpuTarget = prediction - 36;
      s.cpuY += clamp(cpuTarget - s.cpuY, -aiSpeed, aiSpeed);
      s.cpuY = clamp(s.cpuY, 0, canvas.height - 72);

      const playerHit = s.bx <= 34 && s.bx >= 16 && s.by >= s.playerY && s.by <= s.playerY + 72 && s.vx < 0;
      const cpuHit = s.bx >= canvas.width - 34 && s.bx <= canvas.width - 16 && s.by >= s.cpuY && s.by <= s.cpuY + 72 && s.vx > 0;

      if (playerHit) {
        s.rally += 1;
        s.lastHit = "player";
        const offset = (s.by - (s.playerY + 36)) / 36;
        s.vx = Math.abs(s.vx) * 1.025;
        s.vy += offset * 1.25;
      }
      if (cpuHit) {
        s.rally += 1;
        s.lastHit = "cpu";
        const offset = (s.by - (s.cpuY + 36)) / 36;
        s.vx = -Math.abs(s.vx) * 1.025;
        s.vy += offset * 1.1;
      }

      if (s.bx > canvas.width + 12) {
        resetBall(-1);
        triggerKnowledgeChallenge();
        return;
      }

      if (s.bx < -12) {
        if (powerUp === "shield") {
          setPowerUp(null);
          setStatusText("Shield absorbed the miss.");
          resetBall(1);
        } else {
          setCpu((score) => {
            const next = score + 1;
            if (next >= POINTS_TO_WIN) {
              window.setTimeout(() => endRun(player, next), 0);
            }
            return next;
          });
          setCombo(0);
          setStatusText("Alexandria scores. Regain control of the rally.");
          resetBall(1);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#15130f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(202,177,124,.22)";
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#d0ad68";
      ctx.fillRect(18, s.playerY, 11, 72);
      ctx.fillRect(canvas.width - 29, s.cpuY, 11, 72);

      ctx.beginPath();
      ctx.arc(s.bx, s.by, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(224,215,195,.56)";
      ctx.fillText(`RALLY ${s.rally}`, canvas.width / 2 - 26, 20);

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, paused, level, powerUp, deck, player, cpu]);

  function movePlayer(clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || phase !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const scaledY = (clientY - rect.top) * (canvas.height / rect.height);
    ballStateRef.current.playerY = clamp(scaledY - 36, 0, canvas.height - 72);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        ballStateRef.current.playerY = clamp(ballStateRef.current.playerY - 30, 0, 288);
      }
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        ballStateRef.current.playerY = clamp(ballStateRef.current.playerY + 30, 0, 288);
      }
      if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  function rewardFor(quality: RetrievalQuality) {
    const difficultyMultiplier = challenge ? Math.max(1, challenge.difficulty) : 1;
    const comboMultiplier = 1 + Math.min(combo, 10) * 0.08;
    const base = quality === "nailed" ? POINTS.recallCheck : quality === "partial" ? Math.max(1, Math.floor(POINTS.recallCheck / 2)) : 0;
    return Math.round(base * difficultyMultiplier * comboMultiplier);
  }

  function scoreChallenge(quality: RetrievalQuality) {
    if (!challenge) return;
    recordRetrievalScore(challenge.card.id, quality);
    recordKnowledgeEngagement(challenge.card.refType, challenge.card.refId);

    const gainedXp = rewardFor(quality);
    if (gainedXp > 0) {
      awardPoints("recall-check", `Recall Rally L${level} · ${challenge.card.label} · ${challenge.type}`, gainedXp, challenge.card.refId);
      setXpEarned((value) => value + gainedXp);
    }

    setQuestions((value) => value + 1);
    setConceptsTested((items) => [...new Set([...items, challenge.card.label])]);

    if (quality === "nailed") {
      setNailed((value) => value + 1);
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setBestCombo((value) => Math.max(value, nextCombo));

      let pointsAwarded = 1;
      if (powerUp === "double") {
        pointsAwarded = 2;
        setPowerUp(null);
      }

      setPlayer((score) => {
        const next = score + pointsAwarded;
        if (next >= POINTS_TO_WIN) {
          window.setTimeout(() => {
            setLevelsWon((value) => value + 1);
            setPhase("level-complete");
          }, 0);
        }
        return next;
      });

      if (nextCombo === 3 && !powerUp) setPowerUp("shield");
      if (nextCombo === 5 && !powerUp) setPowerUp("slow");
      if (nextCombo === 8 && !powerUp) setPowerUp("double");
      setStatusText(nextCombo >= 3 ? `Knowledge combo x${nextCombo}. Power is building.` : "Point confirmed by knowledge.");
    } else if (quality === "partial") {
      setPartial((value) => value + 1);
      setCombo(0);
      setStatusText("Partial recall. No match point awarded; the knowledge stays active.");
    } else {
      setMissed((value) => value + 1);
      setConceptsMissed((items) => [...new Set([...items, challenge.card.label])]);
      setCombo(0);
      setCpu((score) => {
        const next = score + 1;
        if (next >= POINTS_TO_WIN) window.setTimeout(() => endRun(player, next), 0);
        return next;
      });
      setStatusText("Knowledge miss. Alexandria takes the point and the concept returns sooner.");
    }

    window.dispatchEvent(new Event("alexandria:data"));
    setChallenge(null);
    setAnswer("");
    setRevealed(false);
    window.setTimeout(() => setPhase((current) => current === "result" || current === "level-complete" ? current : "playing"), 0);
  }

  function nextLevel() {
    if (level >= MAX_LEVELS) {
      endRun(player, cpu);
      return;
    }
    const next = level + 1;
    setLevel(next);
    resetMatch(next);
    setStatusText(`Level ${next}. Faster ball, stronger opponent, deeper knowledge.`);
    setPhase("playing");
  }

  const accuracy = questions ? Math.round((nailed / questions) * 100) : 0;

  if (phase === "setup") {
    return <section className="view active"><div className="content">
      <button className="ghost-btn" onClick={onExit}>← Back to Game Pad</button>
      <div className="eyebrow top-gap">Recall Rally</div>
      <h1 className="page-title">Classic Pong. Alexandria knowledge decides the score.</h1>
      <p className="page-intro">Beat the paddle mechanically, then earn the point intellectually. Difficulty rises through both ball speed and question depth.</p>

      <article className="card rally-setup">
        <div className="kicker">Knowledge deck</div>
        <label className="import-label">Play with
          <select value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)}>
            <option value="all">All Library · {buildRallyDeck().length} items</option>
            {books.map((book) => <option value={book.title} key={book.id}>{book.title} · {buildRallyDeck(book.title).length} items</option>)}
          </select>
        </label>
        <div className="rally-rules top-gap">
          <div><strong>1</strong><span>Win the Pong rally.</span></div>
          <div><strong>2</strong><span>Answer the knowledge challenge.</span></div>
          <div><strong>3</strong><span>Correct = your point. Miss = Alexandria's point.</span></div>
          <div><strong>4</strong><span>First to 5 wins the level. Each level gets faster and conceptually harder.</span></div>
        </div>
        <button className="small-btn primary top-gap" onClick={startRun} disabled={deck.length < 1}>Start Recall Rally →</button>
        {deck.length === 0 && <p className="saved-note top-gap">This deck has no reviewable imported knowledge yet.</p>}
      </article>
    </div></section>;
  }

  return <section className="view active"><div className="content">
    <div className="button-row">
      <button className="ghost-btn" onClick={() => endRun(player, cpu)}>← End run</button>
      <div className="button-row">
        <span className="pill">Level {level}</span>
        <span className="pill">First to {POINTS_TO_WIN}</span>
        {combo > 1 && <span className="pill">Combo x{combo}</span>}
        {powerUp && <span className="pill">Power: {powerUp}</span>}
      </div>
    </div>

    <div className="rally-score">
      <div><strong>{player}</strong><span>YOU</span></div>
      <i>—</i>
      <div><strong>{cpu}</strong><span>ALEXANDRIA</span></div>
    </div>

    <div className="rally-hud">
      <span>{sourceTitle === "all" ? "All Library" : sourceTitle}</span>
      <span>{accuracy}% knowledge accuracy</span>
      <span>{xpEarned} XP this run</span>
    </div>

    {phase === "playing" && <article className="card rally-stage">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        aria-label="Recall Rally Pong game"
        onPointerMove={(event) => movePlayer(event.clientY)}
        onPointerDown={(event) => movePlayer(event.clientY)}
      />
      <div className="rally-controls">
        <span>{statusText}</span>
        <button className="small-btn" onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
      </div>
      <p className="meta">Touch/mouse to move · ↑ ↓ or W/S on keyboard · Space pauses.</p>
    </article>}

    {phase === "challenge" && challenge && <article className="card review-card quiz-card rally-challenge">
      <div className="review-source">
        <span className="pill">Level {level} · Difficulty {challenge.difficulty}</span>
        <span className="pill">{challenge.type}</span>
        <span className="meta">{challenge.card.label}</span>
      </div>

      <div className="manuscript compact-manuscript">
        <div className="kicker">Knowledge under pressure</div>
        {challenge.type === "recall" ? <p className="meta">The source stays hidden until you commit.</p> : <blockquote>“{challenge.sourceText}”</blockquote>}
      </div>

      {!revealed ? <>
        <h2>{challenge.prompt}</h2>
        <textarea className="recall-input" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer in your own words…" autoFocus />
        <div className="button-row">
          <button className="small-btn" onClick={() => setRevealed(true)}>Reveal reference</button>
          <button className="small-btn primary" onClick={() => setRevealed(true)} disabled={!answer.trim()}>Commit & reveal →</button>
        </div>
      </> : <>
        {answer && <div className="your-recall"><div className="recall-label">Your answer</div><p>{answer}</p></div>}
        <div className="original-text">
          <div className="recall-label">{challenge.type === "application" ? "Reference idea" : "Reference answer"}</div>
          <blockquote>{challenge.expected || challenge.sourceText}</blockquote>
          <p className="meta">{challenge.guidance}</p>
        </div>
        <div className="score-row">
          <button className="score-btn miss" onClick={() => scoreChallenge("blank")}>Miss<span>Alexandria scores</span></button>
          <button className="score-btn partial" onClick={() => scoreChallenge("partial")}>Partial<span>No match point</span></button>
          <button className="score-btn good" onClick={() => scoreChallenge("nailed")}>Nailed it<span>Your point counts</span></button>
        </div>
      </>}
    </article>}

    {phase === "level-complete" && <article className="card review-result rally-level-up">
      <div className="kicker">Level {level} cleared</div>
      <h2>Knowledge held under pressure.</h2>
      <p className="page-intro">The next level increases paddle difficulty and shifts more questions toward interpretation, principle and application.</p>
      <div className="result-stats">
        <div className="result-stat good"><b>{nailed}</b><span>Nailed</span></div>
        <div className="result-stat partial"><b>{partial}</b><span>Partial</span></div>
        <div className="result-stat miss"><b>{missed}</b><span>Missed</span></div>
      </div>
      <button className="small-btn primary" onClick={nextLevel}>{level >= MAX_LEVELS ? "Complete run" : `Enter Level ${level + 1} →`}</button>
    </article>}

    {phase === "result" && <article className="card review-result">
      <div className="kicker">Recall Rally · Run complete</div>
      <h2>{levelsWon > 0 ? `Level ${level} reached.` : "Run ended."}</h2>
      <div className="result-stats">
        <div className="result-stat good"><b>{accuracy}%</b><span>Knowledge accuracy</span></div>
        <div className="result-stat partial"><b>{bestCombo}</b><span>Best combo</span></div>
        <div className="result-stat"><b>{xpEarned}</b><span>XP earned</span></div>
      </div>
      {conceptsMissed.length > 0 && <div className="rally-weaknesses">
        <div className="kicker">Strengthen next</div>
        <p>{conceptsMissed.join(" · ")}</p>
      </div>}
      <p className="page-intro">{conceptsMissed.length ? "Missed concepts have already been fed back into Alexandria's review schedule." : "No knowledge gaps were recorded in this run."}</p>
      <div className="button-row">
        <button className="small-btn" onClick={onExit}>Back to Game Pad</button>
        <button className="small-btn primary" onClick={startRun}>Play again</button>
      </div>
    </article>}
  </div></section>;
}
