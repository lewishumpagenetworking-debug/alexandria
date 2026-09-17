"use client";

import { useEffect, useRef, useState } from "react";
import { agoraScenarios, analysedForumFeedback, initialForumFeedback, interrogationQuestions } from "@/data/mock-data";
import { PageHeader, Rule } from "@/components/page-header";

export function InterrogationView({ resetKey = 0 }: { resetKey?: number }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  useEffect(() => { setIndex(0); setAnswer(""); }, [resetKey]);

  function next() {
    if (!answer.trim()) return;
    setIndex((current) => Math.min(current + 1, interrogationQuestions.length - 1));
    setAnswer("");
  }

  return <section className="view active"><div className="content"><PageHeader eyebrow="Active recall · Socratic examination" title="Interrogation Chamber" intro="Your interpretation stays hidden until you answer. Speak from memory. Precision is more valuable than fluency." />
    <div className="chamber"><article className="card prompt-panel"><div className="prompt-number">{String(index + 1).padStart(2, "0")}</div><div className="kicker">The Beginning of Infinity · Highlight 12</div><h2>{interrogationQuestions[index].prompt}</h2><textarea className="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer in your own language. Do not quote the author." /><div className="mic-row"><button className="mic" title="Dictate with your preferred voice tool" aria-label="Voice compatible input">◉</button><button className="small-btn primary" onClick={next}>Submit & face the next question</button></div></article>
      <aside className="card"><div className="kicker">Path of inquiry</div><div className="path">{["Statement", "Assumptions", "Fundamentals", "Reduction", "Reconstruction", "Boundaries", "Application"].map((label, step) => <div className={`path-step${step === index ? " active" : ""}`} key={label}><span>{step + 1}</span><b>{label}</b></div>)}</div></aside>
    </div></div></section>;
}

export function AgoraView() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [duration, setDuration] = useState(120);
  const [remaining, setRemaining] = useState(120);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => setRemaining((value) => {
      if (value <= 1) { setRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return <section className="view active"><div className="content"><PageHeader eyebrow="Thinking under pressure" title="The Agora" intro="No principle is named for you. Retrieve what matters, reason under constraint, and commit to a response." />
    <article className="card scenario"><div className="scenario-tag">Leadership · Uncertainty · Live scenario</div><h2>{agoraScenarios[scenarioIndex]}</h2><div className="timer">{time}</div>
      <div className="constraint-row">{([300, 120, 60, 30] as const).map((seconds) => <button key={seconds} className={`pill${duration === seconds ? " active" : ""}`} onClick={() => { setDuration(seconds); setRemaining(seconds); setRunning(false); }}>{seconds === 300 ? "5 minutes" : seconds === 120 ? "2 minutes" : seconds === 60 ? "60 seconds" : "30 seconds"}</button>)}</div>
      <Rule /><textarea className="answer" placeholder="Speak or sketch your response. Alexandria will ask which ideas you retrieved only after you commit." /><div className="mic-row"><button className="small-btn" onClick={() => setScenarioIndex((value) => (value + 1) % agoraScenarios.length)}>Draw another situation</button><button className="small-btn primary" onClick={() => { if (!remaining) setRemaining(duration); setRunning(true); }}>Begin response</button></div>
    </article></div></section>;
}

export function ForumView() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(initialForumFeedback);
  return <section className="view active"><div className="content"><PageHeader eyebrow="Clarity under compression" title="The Forum" intro="Can you make another human being understand this—without hiding uncertainty or borrowing authority?" />
    <div className="forum-grid"><article className="card"><div className="kicker">Current exercise</div><h2>Explain sunk costs to a founder who has spent three years building.</h2><label className="meta" htmlFor="audience">Transform the audience</label><select id="audience" className="search select-wide"><option>Intelligent non-expert</option><option>Child</option><option>Expert</option><option>CEO</option><option>Sceptic</option><option>Hostile to the conclusion</option></select><div className="constraint-row"><button className="pill">5 min</button><button className="pill">2 min</button><button className="pill active">60 sec</button><button className="pill">30 sec</button></div><textarea className="answer top-gap" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Speak your explanation here…" /><button className="small-btn primary top-gap" onClick={() => { if (answer.trim()) setFeedback(analysedForumFeedback); }}>Analyse this explanation</button></article>
      <article className="card"><div className="kicker">Diagnostic feedback · no overall score</div><div className="diagnostic">{feedback.map(([category, observation]) => <div className="diag" key={category}><strong>{category}</strong><span>{observation}</span></div>)}</div></article>
    </div></div></section>;
}
