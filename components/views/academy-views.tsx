"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { agoraScenarios, interrogationQuestions } from "@/data/mock-data";
import { PageHeader, Rule } from "@/components/page-header";

function useCountdown(initial = 120) {
  const [duration, setDuration] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { if (!running) return; timer.current = setInterval(() => setRemaining((value) => { if (value <= 1) { setRunning(false); return 0; } return value - 1; }), 1000); return () => { if (timer.current) clearInterval(timer.current); }; }, [running]);
  const choose = (seconds: number) => { setDuration(seconds); setRemaining(seconds); setRunning(false); };
  const start = () => { if (!remaining) setRemaining(duration); setRunning(true); };
  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return { duration, remaining, running, time, choose, start, pause: () => setRunning(false) };
}

function DurationPicker({ value, onChoose }: { value: number; onChoose: (seconds: number) => void }) {
  return <div className="constraint-row">{([300, 120, 60, 30] as const).map((seconds) => <button key={seconds} className={`pill${value === seconds ? " active" : ""}`} onClick={() => onChoose(seconds)}>{seconds === 300 ? "5 minutes" : seconds === 120 ? "2 minutes" : seconds === 60 ? "60 seconds" : "30 seconds"}</button>)}</div>;
}

export function InterrogationView({ resetKey = 0 }: { resetKey?: number }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [responses, setResponses] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  useEffect(() => { setIndex(0); setAnswer(""); setResponses([]); setComplete(false); }, [resetKey]);
  function next() {
    if (!answer.trim()) return;
    const nextResponses = [...responses, answer.trim()]; setResponses(nextResponses); setAnswer("");
    if (index === interrogationQuestions.length - 1) { localStorage.setItem("alexandria-last-interrogation", JSON.stringify({ responses: nextResponses, at: new Date().toISOString() })); setComplete(true); return; }
    setIndex((current) => current + 1);
  }
  return <section className="view active"><div className="content"><PageHeader eyebrow="Active recall · Socratic examination" title="Interrogation Chamber" intro="Your interpretation stays hidden until you answer. Speak from memory. Precision is more valuable than fluency." />
    <div className="manuscript"><div className="kicker">Passage under examination · The Beginning of Infinity</div><blockquote>“Problems are inevitable. Problems are soluble.”</blockquote><p>Highlight 12 · Chapter 9</p></div>
    {complete ? <article className="card completion"><div className="seal">A</div><div><div className="kicker">Examination complete</div><h2>The thought has survived seven questions.</h2><p className="meta">Your reconstruction is preserved locally. The next step is to test its boundary conditions in action.</p><button className="small-btn primary" onClick={() => { setIndex(0); setResponses([]); setComplete(false); }}>Begin another examination</button></div></article> : <div className="chamber"><article className="card prompt-panel"><div className="prompt-number">{String(index + 1).padStart(2, "0")}</div><div className="kicker">Question {index + 1} of {interrogationQuestions.length}</div><h2>{interrogationQuestions[index].prompt}</h2><textarea className="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer in your own language. Do not quote the author." /><div className="mic-row"><button className="mic" title="Dictate with your preferred voice tool" aria-label="Voice compatible input">◉</button><button className="small-btn primary" onClick={next}>{index === interrogationQuestions.length - 1 ? "Complete examination" : "Submit & face the next question"}</button></div></article>
      <aside className="card"><div className="kicker">Path of inquiry</div><div className="path">{["Statement", "Assumptions", "Fundamentals", "Reduction", "Reconstruction", "Boundaries", "Application"].map((label, step) => <div className={`path-step${step === index ? " active" : step < index ? " complete" : ""}`} key={label}><span>{step < index ? "✓" : step + 1}</span><b>{label}</b></div>)}</div></aside></div>}
  </div></section>;
}

const principleStages = [
  ["Statement", "What is actually being claimed?"], ["Assumptions", "What must be true for this to hold? What is merely assumed?"], ["Observations", "What is directly observed, without interpretation?"], ["Fundamental truths", "What remains irreducible?"], ["Reduction", "What can be removed without destroying the claim?"], ["Reconstruction", "Starting only from the fundamentals, what conclusion would you build?"], ["Boundary conditions", "Where does this stop being true or useful?"], ["Application", "What changes in tomorrow’s decision?"],
] as const;

export function FirstPrinciplesView() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { try { setValues(JSON.parse(localStorage.getItem("alexandria-first-principles") || "{}")); } catch {} }, []);
  function update(stage: string, value: string) { setValues((current) => ({ ...current, [stage]: value })); setSaved(false); }
  function save() { localStorage.setItem("alexandria-first-principles", JSON.stringify(values)); setSaved(true); }
  const complete = Object.values(values).filter((value) => value.trim()).length;
  return <section className="view active"><div className="content"><PageHeader eyebrow="Reduction · Reconstruction" title="First Principles" intro="Strip a claim of borrowed language. Separate observation from assumption, then rebuild only what the fundamentals support." />
    <div className="principles-status"><span>{complete} of {principleStages.length} stages articulated</span><button className="small-btn primary" onClick={save}>Save reasoning</button></div>
    <div className="principles-workbench">{principleStages.map(([stage, prompt], index) => <article className={`principle-stage${values[stage]?.trim() ? " filled" : ""}`} key={stage}><div className="stage-number">{String(index + 1).padStart(2, "0")}</div><div><div className="kicker">{stage}</div><h3>{prompt}</h3><textarea value={values[stage] || ""} onChange={(event) => update(stage, event.target.value)} placeholder="Write only what you can defend…" /></div></article>)}</div>{saved && <div className="saved-note">Reasoning preserved locally. Return when new evidence changes the reconstruction.</div>}
  </div></section>;
}

export function AgoraView() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState(false);
  const clock = useCountdown(120);
  function submit() { if (!response.trim()) return; clock.pause(); localStorage.setItem("alexandria-last-agora", JSON.stringify({ scenario: agoraScenarios[scenarioIndex], response, at: new Date().toISOString() })); setFeedback(true); }
  return <section className="view active"><div className="content"><PageHeader eyebrow="Thinking under pressure" title="The Agora" intro="No principle is named for you. Retrieve what matters, reason under constraint, and commit to a response." />
    <article className="card scenario"><div className="scenario-tag">Leadership · Uncertainty · Live scenario</div><h2>{agoraScenarios[scenarioIndex]}</h2><div className={`timer${clock.running ? " running" : ""}`}>{clock.time}</div><DurationPicker value={clock.duration} onChoose={clock.choose} /><Rule /><textarea className="answer" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Speak or sketch your response. Alexandria reveals its diagnostic only after you commit." /><div className="mic-row"><button className="small-btn" onClick={() => { setScenarioIndex((value) => (value + 1) % agoraScenarios.length); setFeedback(false); setResponse(""); }}>Draw another situation</button><div className="button-row"><button className="small-btn" onClick={clock.running ? clock.pause : clock.start}>{clock.running ? "Pause" : "Begin response"}</button><button className="small-btn primary" onClick={submit}>Commit response</button></div></div></article>
    {feedback && <div className="feedback-grid"><article className="diag"><strong>Relevant principles retrieved</strong><span>Optionality; preserve authority without defending a weak assumption.</span></article><article className="diag"><strong>Assumptions made</strong><span>You assume public concession necessarily reduces confidence.</span></article><article className="diag"><strong>Counterarguments missed</strong><span>Visible correction may strengthen trust when the team values truth over theatre.</span></article><article className="diag"><strong>Alternative interpretation</strong><span>The colleague may be testing whether dissent is genuinely safe.</span></article><article className="diag"><strong>Application quality</strong><span>Your next action is concrete; add the evidence that would make you reverse it.</span></article></div>}
  </div></section>;
}

const feedbackCategories = ["Clarity", "Structure", "Reasoning", "Examples", "Analogy", "Compression", "Objections", "Repetition", "Unsupported claims", "Conclusion"];

export function ForumView() {
  const [answer, setAnswer] = useState("");
  const [audience, setAudience] = useState("Intelligent non-expert");
  const [format, setFormat] = useState("Explanation");
  const [analysed, setAnalysed] = useState(false);
  const clock = useCountdown(60);
  const observations = useMemo(() => ({
    Clarity: "The central distinction appears early and in plain language.", Structure: "Move the decision question ahead of the definition.", Reasoning: "The causal chain from past cost to future choice is sound.", Examples: "One concrete founder decision is enough; cut the second example.", Analogy: "The theatre-ticket analogy fits a non-expert, but not a hostile critic.", Compression: "Your final third repeats the definition. Replace it with the test question.", Objections: "Acknowledge reputation and morale as present costs, not reasons to honour sunk cost.", Repetition: "‘Already spent’ appears four times; twice is sufficient.", "Unsupported claims": "Qualify the claim that rational people ignore the past.", Conclusion: "End with: If we had not already invested, would we begin today?",
  }), []);
  function submit() { if (!answer.trim()) return; clock.pause(); setAnalysed(true); localStorage.setItem("alexandria-last-forum", JSON.stringify({ answer, audience, format, at: new Date().toISOString() })); }
  return <section className="view active"><div className="content"><PageHeader eyebrow="Clarity under compression" title="The Forum" intro="Make another human being understand—without hiding uncertainty or borrowing authority." />
    <div className="forum-grid"><article className="card"><div className="kicker">Current speaking challenge</div><h2>Explain sunk costs to a founder who has spent three years building.</h2><div className="form-grid"><label>Audience<select value={audience} onChange={(e) => setAudience(e.target.value)}>{["Child", "Intelligent non-expert", "CEO", "Expert", "Sceptic", "Hostile critic"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}>{["Explanation", "Argument", "Story", "Debate response", "Impromptu speech"].map((item) => <option key={item}>{item}</option>)}</select></label></div><DurationPicker value={clock.duration} onChoose={clock.choose} /><div className={`timer forum-timer${clock.running ? " running" : ""}`}>{clock.time}</div><textarea className="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Speak your response here…" /><div className="mic-row"><button className="small-btn" onClick={clock.running ? clock.pause : clock.start}>{clock.running ? "Pause" : "Start timer"}</button><button className="small-btn primary" onClick={submit}>Submit for diagnosis</button></div></article>
      <article className="card"><div className="kicker">Diagnostic feedback · no overall score</div>{analysed ? <div className="diagnostic">{feedbackCategories.map((category) => <div className="diag" key={category}><strong>{category}</strong><span>{observations[category as keyof typeof observations]}</span></div>)}</div> : <div className="awaiting-feedback"><div className="seal">F</div><h3>The Forum listens before it judges.</h3><p className="meta">Submit a response to reveal specific evidence across ten dimensions.</p></div>}</article>
    </div></div></section>;
}
