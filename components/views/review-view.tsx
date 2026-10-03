"use client";

import { useState, useEffect } from "react";
import { type RetrievalQuality } from "@/lib/retrieval-store";
import { getKnowledgeChallenge, recordSculptorChallengeResult, type SculptorChallenge } from "@/lib/sculptor-challenge-engine";
import { awardPoints, POINTS } from "@/lib/points-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";
import { SourceReference } from "@/components/source-reference";
import { getReviewEvidence } from "@/lib/review-evidence";
import { loadLearningCampaign } from "@/lib/curriculum-store";
import { curriculumBookById, curriculumFocusById } from "@/data/curriculum";
import { loadBooks } from "@/lib/application-store";
import { getHighlightsForSource, getPrinciplesForSource } from "@/lib/library-notes-store";
import { saveCapture } from "@/lib/capture-store";

type Phase = "idle" | "recall" | "revealed" | "done";

export function ReviewView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [queue, setQueue] = useState<SculptorChallenge[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [response, setResponse] = useState("");
  const [scores, setScores] = useState<RetrievalQuality[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [campaignReview, setCampaignReview] = useState<{ prompt: string; capabilityTitle: string; leaderTitle: string } | null>(null);
  const [synthesis, setSynthesis] = useState("");

  useEffect(() => {
    const challenges: SculptorChallenge[] = [];
    const excluded = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const challenge = getKnowledgeChallenge({
        allowedTypes: ["diagnosis"],
        difficulty: 2,
        dueOnly: true,
        excludeUnitIds: excluded,
        recordSurface: false,
      });
      if (!challenge) break;
      challenges.push(challenge);
      excluded.add(challenge.unit.id);
    }
    setQueue(challenges);
    setTotalDue(challenges.length);
    setPhase(challenges.length > 0 ? "recall" : "done");

    const campaign = loadLearningCampaign();
    if (campaign) {
      const focus = curriculumFocusById(campaign.focusId);
      const capability = curriculumBookById(campaign.capabilityBookId);
      const leader = curriculumBookById(campaign.leaderBookId);
      const books = loadBooks({ includeArchived: true, includeDeleted: false });
      const match = (title?: string, author?: string) => books.find(book => book.title.toLowerCase() === title?.toLowerCase() && book.author.toLowerCase() === author?.toLowerCase());
      const capabilityBook = match(capability?.title, capability?.author);
      const leaderBook = match(leader?.title, leader?.author);
      const hasEvidence = (book: typeof capabilityBook) => !!book && (getHighlightsForSource(book.id).length > 0 || getPrinciplesForSource(book.id).length > 0);
      if (focus && capability && leader && hasEvidence(capabilityBook) && hasEvidence(leaderBook)) {
        setCampaignReview({ prompt: focus.synthesisPrompt, capabilityTitle: capability.title, leaderTitle: leader.title });
      }
    }
  }, []);

  function captureSynthesis() {
    if (!campaignReview || !synthesis.trim()) return;
    saveCapture({
      type: "Connection",
      text: `Dual-track synthesis — ${campaignReview.capabilityTitle} × ${campaignReview.leaderTitle}\n\nQuestion: ${campaignReview.prompt}\n\nSynthesis: ${synthesis.trim()}`,
      category: "cross-domain synthesis",
      relatedBook: campaignReview.capabilityTitle,
      inputSource: "keyboard",
    });
    awardPoints("capture", "Captured a dual-track synthesis", POINTS.capture);
    window.dispatchEvent(new Event("alexandria:data"));
    setSynthesis("");
    setCampaignReview(null);
  }

  function score(quality: RetrievalQuality) {
    const challenge = queue[index];
    const card = challenge.card;
    recordSculptorChallengeResult(challenge, response, quality, "review");
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

  const challenge = queue[index];
  const card = challenge?.card;
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
          {campaignReview && <article className="card review-card campaign-synthesis-card">
          <div className="kicker">Dual-track synthesis · evidence exists in both books</div>
          <h2>{campaignReview.capabilityTitle} × {campaignReview.leaderTitle}</h2>
          <p className="review-prompt">{campaignReview.prompt}</p>
          <textarea className="recall-input" value={synthesis} onChange={event => setSynthesis(event.target.value)} placeholder="Extract the transferable mechanism, then state explicitly where the analogy breaks…" />
          <div className="button-row"><button className="small-btn primary" disabled={!synthesis.trim()} onClick={captureSynthesis}>Capture synthesis →</button></div>
        </article>}
          <article className="card review-empty">
            <p className="review-empty-icon">✓</p>
            <h2>Nothing due for review</h2>
            <p>Your next quote review will be scheduled automatically based on how closely your interpretation matched the stored diagnosis.</p>
            <p className="meta">Review is quote-first. Add more book highlights to grow this queue; principles remain available elsewhere in Alexandria.</p>
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
          {campaignReview && <article className="card review-card campaign-synthesis-card">
          <div className="kicker">Dual-track synthesis · evidence exists in both books</div>
          <h2>{campaignReview.capabilityTitle} × {campaignReview.leaderTitle}</h2>
          <p className="review-prompt">{campaignReview.prompt}</p>
          <textarea className="recall-input" value={synthesis} onChange={event => setSynthesis(event.target.value)} placeholder="Extract the transferable mechanism, then state explicitly where the analogy breaks…" />
          <div className="button-row"><button className="small-btn primary" disabled={!synthesis.trim()} onClick={captureSynthesis}>Capture synthesis →</button></div>
        </article>}
          <article className="card review-result">
            <div className="result-stats">
              <div className="result-stat good"><b>{nailed}</b><span>Exact</span></div>
              <div className="result-stat partial"><b>{partial}</b><span>Partial</span></div>
              <div className="result-stat miss"><b>{blank}</b><span>Nowhere near</span></div>
            </div>
            <p className="review-summary">
              {nailed > partial + blank
                ? "Strong interpretive alignment. These ideas are becoming easier to reconstruct accurately."
                : blank > nailed
                ? "Several interpretation gaps were exposed. Those quotes will return sooner so you can refine the diagnosis."
                : "Mixed alignment. Spaced review will adjust automatically around the concepts that still need work."}
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

  if (!card || !challenge) return null;

  return (
    <section className="view active">
      <div className="content">
        <div className="section-tools">
          <div className="eyebrow">Review · {index + 1} of {queue.length}</div>
          <div className="review-progress-bar"><span style={{ width: `${(index / queue.length) * 100}%` }} /></div>
        </div>

{campaignReview && <article className="card review-card campaign-synthesis-card">
          <div className="kicker">Dual-track synthesis · evidence exists in both books</div>
          <h2>{campaignReview.capabilityTitle} × {campaignReview.leaderTitle}</h2>
          <p className="review-prompt">{campaignReview.prompt}</p>
          <textarea className="recall-input" value={synthesis} onChange={event => setSynthesis(event.target.value)} placeholder="Extract the transferable mechanism, then state explicitly where the analogy breaks…" />
          <div className="button-row"><button className="small-btn primary" disabled={!synthesis.trim()} onClick={captureSynthesis}>Capture synthesis →</button></div>
        </article>}

        <article className="card review-card">
          <div className="review-source">
            <span className="pill">{card.refType}</span>
            <span className="meta">{card.label}</span>
            {card.reviewCount > 0 && <span className="meta">reviewed {card.reviewCount}×</span>}
          </div>

          <SourceReference
            label={challenge.unit.sourceTitle}
            text={challenge.unit.quote}
            note={challenge.unit.location ? `${challenge.unit.location} · First diagnose the quote yourself. Alexandria's interpretation and scholarly basis stay hidden until you commit.` : "First diagnose the quote yourself. Alexandria's interpretation and scholarly basis stay hidden until you commit."}
          />

          {phase === "recall" && (
            <div className="recall-phase">
              <p className="review-prompt">{challenge.prompt}</p>
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
