"use client";

import { useEffect, useRef, useState } from "react";
import { listCards, recordRetrievalScore, type RetrievalCard, type RetrievalQuality } from "@/lib/retrieval-store";
import { awardPoints, POINTS } from "@/lib/points-store";

type Phase = "playing" | "challenge" | "result";

export function RecallRally({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [player, setPlayer] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [challenge, setChallenge] = useState<RetrievalCard | null>(null);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const deckRef = useRef<RetrievalCard[]>([]);
  const deckIndexRef = useRef(0);
  const stateRef = useRef({ y: 135, cpuY: 135, bx: 320, by: 180, vx: 4.2, vy: 2.7 });

  useEffect(() => {
    deckRef.current = listCards();
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resetBall = (direction: 1 | -1) => {
      const s = stateRef.current;
      s.bx = canvas.width / 2;
      s.by = canvas.height / 2;
      s.vx = 4.2 * direction;
      s.vy = (Math.random() > .5 ? 1 : -1) * (2.2 + Math.random() * 1.8);
    };

    const chooseChallenge = () => {
      const deck = deckRef.current;
      if (!deck.length) return;
      const card = deck[deckIndexRef.current % deck.length];
      deckIndexRef.current += 1;
      setChallenge(card);
      setAnswer("");
      setRevealed(false);
      setPhase("challenge");
    };

    const loop = () => {
      const s = stateRef.current;
      s.bx += s.vx;
      s.by += s.vy;

      if (s.by <= 8 || s.by >= canvas.height - 8) s.vy *= -1;

      const cpuTarget = s.by - 35;
      s.cpuY += Math.max(-3.4, Math.min(3.4, cpuTarget - s.cpuY));

      const playerHit = s.bx <= 30 && s.bx >= 18 && s.by >= s.y && s.by <= s.y + 70 && s.vx < 0;
      const cpuHit = s.bx >= canvas.width - 30 && s.bx <= canvas.width - 18 && s.by >= s.cpuY && s.by <= s.cpuY + 70 && s.vx > 0;

      if (playerHit) {
        s.vx = Math.abs(s.vx) * 1.03;
        s.vy += (s.by - (s.y + 35)) * .04;
      }
      if (cpuHit) {
        s.vx = -Math.abs(s.vx) * 1.03;
        s.vy += (s.by - (s.cpuY + 35)) * .04;
      }

      if (s.bx > canvas.width + 10) {
        chooseChallenge();
        resetBall(-1);
        return;
      }
      if (s.bx < -10) {
        setCpu((score) => {
          const next = score + 1;
          if (next >= 5) setPhase("result");
          return next;
        });
        resetBall(1);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#171512";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(205,180,125,.24)";
      ctx.setLineDash([7, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#d2b06c";
      ctx.fillRect(18, s.y, 10, 70);
      ctx.fillRect(canvas.width - 28, s.cpuY, 10, 70);
      ctx.beginPath();
      ctx.arc(s.bx, s.by, 7, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  function movePlayer(clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaledY = (clientY - rect.top) * (canvas.height / rect.height);
    stateRef.current.y = Math.max(0, Math.min(canvas.height - 70, scaledY - 35));
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") stateRef.current.y = Math.max(0, stateRef.current.y - 28);
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") stateRef.current.y = Math.min(290, stateRef.current.y + 28);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  function scoreChallenge(quality: RetrievalQuality) {
    if (!challenge) return;
    recordRetrievalScore(challenge.id, quality);
    if (quality === "nailed") {
      setPlayer((score) => {
        const next = score + 1;
        if (next >= 5) setPhase("result");
        return next;
      });
      awardPoints("recall-check", `Recall Rally: ${challenge.label}`, POINTS.recallCheck);
    } else if (quality === "partial") {
      awardPoints("recall-check", `Recall Rally partial: ${challenge.label}`, Math.floor(POINTS.recallCheck / 2));
    } else {
      setCpu((score) => {
        const next = score + 1;
        if (next >= 5) setPhase("result");
        return next;
      });
    }
    window.dispatchEvent(new Event("alexandria:data"));
    setChallenge(null);
    setAnswer("");
    setRevealed(false);
    setTimeout(() => {
      setPhase((current) => current === "result" ? current : "playing");
    }, 0);
  }

  return <section className="view active"><div className="content">
    <div className="button-row">
      <button className="ghost-btn" onClick={onExit}>← Back to Game Pad</button>
      <span className="pill">First to 5</span>
    </div>
    <div className="eyebrow top-gap">Recall Rally</div>
    <h1 className="page-title">Pong where knowledge scores the point.</h1>
    <div className="rally-score"><strong>{player}</strong><span>YOU</span><i>—</i><span>ALEXANDRIA</span><strong>{cpu}</strong></div>

    {phase === "playing" && <article className="card rally-stage">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        aria-label="Recall Rally game"
        onPointerMove={(e) => movePlayer(e.clientY)}
        onPointerDown={(e) => movePlayer(e.clientY)}
      />
      <p className="meta">Move with your finger/mouse, or ↑ ↓ / W S. Beat the paddle, then retrieve knowledge to earn the point.</p>
    </article>}

    {phase === "challenge" && challenge && <article className="card review-card quiz-card">
      <div className="kicker">Point challenge · {challenge.label}</div>
      {!revealed ? <>
        <h2>Retrieve it before looking.</h2>
        <textarea className="recall-input" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="What do you remember?" autoFocus />
        <button className="small-btn primary" onClick={() => setRevealed(true)}>Reveal answer</button>
      </> : <>
        {answer && <div className="your-recall"><div className="recall-label">Your answer</div><p>{answer}</p></div>}
        <div className="original-text"><div className="recall-label">Original</div><blockquote>{challenge.text}</blockquote></div>
        <div className="score-row">
          <button className="score-btn miss" onClick={() => scoreChallenge("blank")}>Miss<span>Alexandria scores</span></button>
          <button className="score-btn partial" onClick={() => scoreChallenge("partial")}>Partial<span>No game point</span></button>
          <button className="score-btn good" onClick={() => scoreChallenge("nailed")}>Nailed it<span>You score</span></button>
        </div>
      </>}
    </article>}

    {phase === "result" && <article className="card review-result">
      <div className="kicker">Match complete</div>
      <h2>{player > cpu ? "Victory." : "Alexandria wins this round."}</h2>
      <p className="page-intro">{player > cpu ? "Your retrieval held under pressure." : "The missed knowledge has been pushed back into the review system. Strengthen it and take the rematch."}</p>
      <div className="button-row">
        <button className="small-btn" onClick={onExit}>Back to Game Pad</button>
        <button className="small-btn primary" onClick={() => { setPlayer(0); setCpu(0); setPhase("playing"); }}>Rematch</button>
      </div>
    </article>}
  </div></section>;
}
