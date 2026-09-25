"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { agoraScenarios, forumChallenges, interrogationQuestions } from "@/data/mock-data";
import { PageHeader, Rule } from "@/components/page-header";
import { loadBooks } from "@/lib/application-store";
import { listCaptures } from "@/lib/capture-store";
import { listAgoraSessions, listForumSessions, type RecallStage } from "@/lib/academy-store";
import type { SourceRef } from "@/lib/path-store";
import { getLearningDraft, removeLearningDraft, saveLearningDraft } from "@/lib/learning-draft-store";
import { isAIConfigured } from "@/lib/settings-store";
import { getAIFeedback } from "@/services/ai/browser-ai-client";

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

function LimitationNote({ children }: { children: string }) {
  return <p className="limitation-note">{children}</p>;
}

/** Purely additive: renders nothing unless an AI provider is configured in Settings. */
function AIFeedbackPanel({ context, instruction, userResponse }: { context: string; instruction: string; userResponse: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  if (!isAIConfigured()) return null;

  async function request() {
    setState("loading");
    try {
      const text = await getAIFeedback({ context, instruction, userResponse });
      setFeedback(text); setState("done");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "AI feedback failed."); setState("error");
    }
  }

  return <div className="ai-feedback top-gap">
    {state === "idle" && <button className="small-btn" onClick={request}>✦ Get AI feedback</button>}
    {state === "loading" && <p className="meta">Asking your configured AI provider…</p>}
    {state === "done" && <article className="diag ai-diag"><strong>AI feedback</strong><span>{feedback}</span></article>}
    {state === "error" && <><p className="saved-note">{feedback}</p><button className="small-btn" onClick={request}>Try again</button></>}
  </div>;
}

export type InterrogationResult = { exerciseType: "interrogation"; passageText: string; passageSource: string; responses: string[] };

const SOCRATIC_HELP = [
  {
    simple: "Why did this idea stand out enough to keep?",
    purpose: "This checks whether the quote matters to you for a reason, rather than because it merely sounds clever.",
    needs: "Say what grabbed your attention and why it may be useful, surprising, questionable, or connected to something you care about."
  },
  {
    simple: "What do you think the author is really saying?",
    purpose: "This separates your understanding from the author's exact wording.",
    needs: "Explain the claim in plain language as if the reader had never seen the quote."
  },
  {
    simple: "What has to be true for this claim to work?",
    purpose: "Every claim rests on assumptions. This question makes you expose them.",
    needs: "Name the conditions, beliefs, or facts the claim depends on. Do not argue for them yet."
  },
  {
    simple: "Which parts are essential, and which parts are decoration?",
    purpose: "This tests whether you can identify the core idea instead of memorising the wording.",
    needs: "Strip the quote down to the smallest idea that would still preserve its meaning."
  },
  {
    simple: "Could you rebuild the idea yourself from those essentials?",
    purpose: "If you can reconstruct the conclusion without copying it, you probably understand it.",
    needs: "Start from the essentials you identified and explain how they lead to a conclusion in your own words."
  },
  {
    simple: "Where would this idea stop being true or useful?",
    purpose: "Strong reasoning looks for limits, exceptions, and counterexamples.",
    needs: "Give at least one situation where the claim would fail, become misleading, or need qualification."
  },
  {
    simple: "Where could you actually use this?",
    purpose: "Knowledge becomes more durable when it is connected to a real decision or behaviour.",
    needs: "Name one concrete situation, decision, habit, project, or problem where this idea could change what you do."
  },
] as const;

export function InterrogationView({ passage: passageOverride, onComplete, draftKey, sourceRef, onSaveForLater }: {
  passage?: { text: string; source: string };
  onComplete: (result: InterrogationResult) => void;
  draftKey?: string;
  sourceRef?: SourceRef;
  onSaveForLater?: () => void;
}) {
  const existingDraft = draftKey ? getLearningDraft(draftKey, sourceRef) : undefined;
  const [index, setIndex] = useState(() => Number(existingDraft?.state.index ?? 0));
  const [answer, setAnswer] = useState(() => String(existingDraft?.state.answer ?? ""));
  const [responses, setResponses] = useState<string[]>(() => Array.isArray(existingDraft?.state.responses) ? existingDraft!.state.responses as string[] : []);
  const [complete, setComplete] = useState(() => Boolean(existingDraft?.state.complete ?? false));
  const [helpOpen, setHelpOpen] = useState(false);
  const [passage, setPassage] = useState(passageOverride ?? { text: "Problems are inevitable. Problems are soluble.", source: "The Beginning of Infinity" });

  useEffect(() => {
    if (passageOverride) { setPassage(passageOverride); return; }
    const books = loadBooks();
    const latestBookWithHighlight = [...books].reverse().find((book) => book.highlights.length);
    if (latestBookWithHighlight) {
      setPassage({ text: latestBookWithHighlight.highlights[latestBookWithHighlight.highlights.length - 1], source: latestBookWithHighlight.title });
      return;
    }
    const capture = listCaptures().find((item) => item.type === "Book highlight" || item.type === "Thought" || item.type === "Question");
    if (capture) setPassage({ text: capture.text, source: capture.relatedBook || capture.source || capture.type });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftKey) return;
    saveLearningDraft({
      stepId: draftKey,
      exerciseType: "interrogation",
      sourceRef,
      state: { index, answer, responses, complete },
    });
  }, [draftKey, sourceRef, index, answer, responses, complete]);

  function saveForLater() {
    if (draftKey) {
      saveLearningDraft({
        stepId: draftKey,
        exerciseType: "interrogation",
        sourceRef,
        state: { index, answer, responses, complete },
        deferred: true,
      });
    }
    onSaveForLater?.();
  }

  function next() {
    if (!answer.trim()) return;
    const nextResponses = [...responses, answer.trim()]; setResponses(nextResponses); setAnswer("");
    if (index === interrogationQuestions.length - 1) { setComplete(true); return; }
    setIndex((current) => current + 1);
  }

  return <section className="view active"><div className="content"><PageHeader eyebrow="Active recall · Socratic examination" title="Interrogation Chamber" intro="Your interpretation stays hidden until you answer. Speak from memory. Precision is more valuable than fluency." />
    <div className="manuscript"><div className="kicker">Passage under examination · {passage.source}</div><blockquote>“{passage.text}”</blockquote><p>Your most recent captured idea is examined before Alexandria supplies interpretation.</p></div>
    {complete ? <article className="card completion"><div className="seal">A</div><div><div className="kicker">Examination complete</div><h2>The thought has survived seven questions.</h2><p className="meta">Your reconstruction is preserved locally. The next step is to test its boundary conditions in action.</p><AIFeedbackPanel context={`Passage: "${passage.text}" (${passage.source})`} instruction="Assess these seven Socratic reconstruction answers for rigor, precision, and whether they reveal genuine understanding versus borrowed language." userResponse={responses.map((response, index) => `${index + 1}. ${interrogationQuestions[index].prompt}\n${response}`).join("\n\n")} /><button className="small-btn primary top-gap" onClick={() => { if (draftKey) removeLearningDraft(draftKey, sourceRef); onComplete({ exerciseType: "interrogation", passageText: passage.text, passageSource: passage.source, responses }); }}>Continue to the next step →</button></div></article> : <div className="chamber"><article className="card prompt-panel"><div className="prompt-number">{String(index + 1).padStart(2, "0")}</div><div className="kicker">Question {index + 1} of {interrogationQuestions.length}</div><h2>{interrogationQuestions[index].prompt}</h2>
      <button type="button" className="question-help-toggle" onClick={() => setHelpOpen((open) => !open)}>What is this asking?</button>
      {helpOpen && <div className="question-help">
        <strong>In simple terms</strong><p>{SOCRATIC_HELP[index].simple}</p>
        <strong>Why Alexandria asks it</strong><p>{SOCRATIC_HELP[index].purpose}</p>
        <strong>What your answer needs</strong><p>{SOCRATIC_HELP[index].needs}</p>
      </div>}
      <textarea className="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer in your own language. Do not quote the author." /><div className="mic-row"><div className="button-row"><button className="mic" title="Dictate with your preferred voice tool" aria-label="Voice compatible input">◉</button>{onSaveForLater && <button type="button" className="small-btn" onClick={saveForLater}>Save for later</button>}</div><button className="small-btn primary" onClick={next}>{index === interrogationQuestions.length - 1 ? "Complete examination" : "Submit & face the next question"}</button></div></article>
      <aside className="card"><div className="kicker">Path of inquiry</div><div className="path">{["Statement", "Assumptions", "Fundamentals", "Reduction", "Reconstruction", "Boundaries", "Application"].map((label, step) => <div className={`path-step${step === index ? " active" : step < index ? " complete" : ""}`} key={label}><span>{step < index ? "✓" : step + 1}</span><b>{label}</b></div>)}</div></aside></div>}
  </div></section>;
}

export const principleStages = [
  ["Statement", "What is actually being claimed?"], ["Assumptions", "What must be true for this to hold? What is merely assumed?"], ["Observations", "What is directly observed, without interpretation?"], ["Fundamental truths", "What remains irreducible?"], ["Reduction", "What can be removed without destroying the claim?"], ["Reconstruction", "Starting only from the fundamentals, what conclusion would you build?"], ["Boundary conditions", "Where does this stop being true or useful?"], ["Application", "What changes in tomorrow’s decision?"],
] as const;

export type FirstPrinciplesResult = { exerciseType: "first-principles"; values: Record<string, string> };

export function FirstPrinciplesView({ stage, priorWork, onComplete }: {
  stage: "reduce" | "rebuild";
  priorWork?: { label: string; text: string };
  onComplete: (result: FirstPrinciplesResult) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  function update(label: string, value: string) { setValues((current) => ({ ...current, [label]: value })); }
  const complete = Object.values(values).filter((value) => value.trim()).length;
  const done = complete === principleStages.length;

  return <section className="view active"><div className="content"><PageHeader eyebrow={stage === "reduce" ? "Reduction" : "Reduction · Reconstruction"} title="First Principles" intro={stage === "reduce" ? "Strip a claim of borrowed language. Separate observation from assumption before anything is rebuilt." : "Starting only from what you established last time, rebuild the conclusion from scratch."} />
    {priorWork && <div className="manuscript"><div className="kicker">Carried forward · {priorWork.label}</div><blockquote>“{priorWork.text}”</blockquote><p>Rebuild without leaning on this phrasing — treat it as a fact to reconstruct from, not an answer to repeat.</p></div>}
    <div className="principles-status"><span>{complete} of {principleStages.length} stages articulated</span></div>
    <div className="principles-workbench">{principleStages.map(([label, prompt], index) => <article className={`principle-stage${values[label]?.trim() ? " filled" : ""}`} key={label}><div className="stage-number">{String(index + 1).padStart(2, "0")}</div><div><div className="kicker">{label}</div><h3>{prompt}</h3><textarea value={values[label] || ""} onChange={(event) => update(label, event.target.value)} placeholder="Write only what you can defend…" /></div></article>)}</div>
    {done && <AIFeedbackPanel context={priorWork ? `Rebuilding from: "${priorWork.text}"` : "A first-principles reduction, stage by stage."} instruction="Assess whether each stage genuinely follows from the fundamentals rather than restating the original claim in different words." userResponse={principleStages.map(([label]) => `${label}: ${values[label] || "(blank)"}`).join("\n")} />}
    <div className="mic-row top-gap"><span className="voice-note">{done ? "All stages articulated." : `${principleStages.length - complete} stages remaining before you can continue.`}</span><button className="small-btn primary" disabled={!done} onClick={() => onComplete({ exerciseType: "first-principles", values })}>Continue to the next step →</button></div>
  </div></section>;
}

export type AgoraResult = { exerciseType: "agora"; scenario: string; durationSeconds: number; response: string };

export interface BookStudyContext {
  sourceTitle: string;
  anchorText: string;
  location?: string;
  interpretation?: string;
  principle?: string;
  reconstruction?: string;
  relationshipConfidence?: "exact" | "book-level" | "none";
}

export function AgoraView({ onComplete, studyContext }: { onComplete: (result: AgoraResult) => void; studyContext?: BookStudyContext }) {
  const scenario = useMemo(() => studyContext
    ? `Apply the idea you have been developing from ${studyContext.sourceTitle} to a concrete decision. Use the claim below, decide whether it really applies, state what evidence would support it, and name what would make you reject it.\n\n"${studyContext.reconstruction || studyContext.principle || studyContext.anchorText}"`
    : agoraScenarios[listAgoraSessions().length % agoraScenarios.length], [studyContext]);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState(false);
  const clock = useCountdown(120);
  function submit() { if (!response.trim()) return; clock.pause(); setFeedback(true); }
  return <section className="view active"><div className="content"><PageHeader eyebrow="Thinking under pressure" title="The Agora" intro={studyContext ? `Stay inside ${studyContext.sourceTitle}. Test whether the idea survives a real decision before moving on.` : "No principle is named for you. Retrieve what matters, reason under constraint, and commit to a response."} />
    <article className="card scenario"><div className="scenario-tag">{studyContext ? `Book application · ${studyContext.sourceTitle}` : "Leadership · Uncertainty · Live scenario"}</div>{studyContext && <div className="manuscript compact-manuscript"><div className="kicker">Session anchor{studyContext.location ? ` · ${studyContext.location}` : ""}</div><blockquote>“{studyContext.anchorText}”</blockquote>{studyContext.principle && <p><strong>Working principle:</strong> {studyContext.principle}</p>}{studyContext.relationshipConfidence === "book-level" && <p className="meta">This principle is related at book level; Alexandria is not claiming it came from this exact row.</p>}</div>}<h2>{scenario}</h2><div className={`timer${clock.running ? " running" : ""}`}>{clock.time}</div><DurationPicker value={clock.duration} onChoose={clock.choose} /><Rule /><textarea className="answer" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Speak or sketch your response. Alexandria reveals its diagnostic only after you commit." /><div className="mic-row"><div className="button-row"><button className="small-btn" onClick={clock.running ? clock.pause : clock.start}>{clock.running ? "Pause" : "Begin response"}</button><button className="small-btn primary" onClick={submit}>Commit response</button></div></div></article>
    {feedback && <><div className="feedback-grid">{studyContext ? <>
        <article className="diag"><strong>Congruency check</strong><span>Did your response actually use the book idea, rather than switch to a generic opinion?</span></article>
        <article className="diag"><strong>Evidence check</strong><span>What evidence would show that this principle applies in the situation you chose?</span></article>
        <article className="diag"><strong>Boundary check</strong><span>What fact would make you stop applying this idea?</span></article>
        <article className="diag"><strong>Action check</strong><span>What concrete decision changes if your reasoning is correct?</span></article>
      </> : <><article className="diag"><strong>Relevant principles retrieved</strong><span>Optionality; preserve authority without defending a weak assumption.</span></article><article className="diag"><strong>Assumptions made</strong><span>You assume public concession necessarily reduces confidence.</span></article><article className="diag"><strong>Counterarguments missed</strong><span>Visible correction may strengthen trust when the team values truth over theatre.</span></article><article className="diag"><strong>Alternative interpretation</strong><span>The colleague may be testing whether dissent is genuinely safe.</span></article><article className="diag"><strong>Application quality</strong><span>Your next action is concrete; add the evidence that would make you reverse it.</span></article></>}</div>
      {!studyContext && <LimitationNote>This diagnostic is a fixed self-assessment template, not AI-generated — add a key in Settings for real AI feedback below.</LimitationNote>}
      <AIFeedbackPanel context={`Scenario: ${scenario}`} instruction="Assess this response for how well it retrieves the relevant principle, names its own assumptions, and commits to a concrete, reversible next action." userResponse={response} />
      <button className="small-btn primary top-gap" onClick={() => onComplete({ exerciseType: "agora", scenario, durationSeconds: clock.duration, response })}>Continue to the next step →</button></>}
  </div></section>;
}

const feedbackCategories = ["Clarity", "Structure", "Reasoning", "Examples", "Analogy", "Compression", "Objections", "Repetition", "Unsupported claims", "Conclusion"];

export type ForumResult = { exerciseType: "forum"; challenge: string; audience: string; format: string; response: string };

export function ForumView({ onComplete, studyContext }: { onComplete: (result: ForumResult) => void; studyContext?: BookStudyContext }) {
  const seed = useMemo(() => studyContext ? {
    challenge: `Explain the idea you have developed from ${studyContext.sourceTitle} to someone who has not read the book. State the claim, explain why it may be true, name one boundary or objection, and show one practical application.`,
    audience: "Intelligent non-expert",
    format: "Explanation",
  } : forumChallenges[listForumSessions().length % forumChallenges.length], [studyContext]);
  const [answer, setAnswer] = useState("");
  const [audience, setAudience] = useState(seed.audience);
  const [format, setFormat] = useState(seed.format);
  const [analysed, setAnalysed] = useState(false);
  const clock = useCountdown(60);
  const observations = useMemo(() => ({
    Clarity: "The central distinction appears early and in plain language.", Structure: "Move the decision question ahead of the definition.", Reasoning: "The causal chain from past cost to future choice is sound.", Examples: "One concrete founder decision is enough; cut the second example.", Analogy: "The theatre-ticket analogy fits a non-expert, but not a hostile critic.", Compression: "Your final third repeats the definition. Replace it with the test question.", Objections: "Acknowledge reputation and morale as present costs, not reasons to honour sunk cost.", Repetition: "‘Already spent’ appears four times; twice is sufficient.", "Unsupported claims": "Qualify the claim that rational people ignore the past.", Conclusion: "End with: If we had not already invested, would we begin today?",
  }), []);
  function submit() { if (!answer.trim()) return; clock.pause(); setAnalysed(true); }
  return <section className="view active"><div className="content"><PageHeader eyebrow="Clarity under compression" title="The Forum" intro={studyContext ? `Finish the ${studyContext.sourceTitle} session by making the same idea understandable without losing its limits.` : "Make another human being understand—without hiding uncertainty or borrowing authority."} />
    <div className="forum-grid"><article className="card"><div className="kicker">Current speaking challenge</div>{studyContext && <div className="manuscript compact-manuscript"><div className="kicker">Book thread · {studyContext.sourceTitle}</div><blockquote>“{studyContext.reconstruction || studyContext.principle || studyContext.anchorText}”</blockquote></div>}<h2>{seed.challenge}</h2><div className="form-grid"><label>Audience<select value={audience} onChange={(e) => setAudience(e.target.value)}>{["Child", "Intelligent non-expert", "CEO", "Expert", "Sceptic", "Hostile critic"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}>{["Explanation", "Argument", "Story", "Debate response", "Impromptu speech"].map((item) => <option key={item}>{item}</option>)}</select></label></div><DurationPicker value={clock.duration} onChoose={clock.choose} /><div className={`timer forum-timer${clock.running ? " running" : ""}`}>{clock.time}</div><textarea className="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Speak your response here…" /><div className="mic-row"><button className="small-btn" onClick={clock.running ? clock.pause : clock.start}>{clock.running ? "Pause" : "Start timer"}</button><button className="small-btn primary" onClick={submit}>Submit for diagnosis</button></div></article>
      <article className="card"><div className="kicker">Diagnostic feedback · no overall score</div>{analysed ? <><div className="diagnostic">{studyContext ? <>
        <div className="diag"><strong>Fidelity</strong><span>Did you preserve the central claim from the book without simply repeating its wording?</span></div>
        <div className="diag"><strong>Reasoning</strong><span>Did you explain why the conclusion follows?</span></div>
        <div className="diag"><strong>Boundary</strong><span>Did you state where the idea may fail or require qualification?</span></div>
        <div className="diag"><strong>Application</strong><span>Did you give a concrete use rather than an abstract example?</span></div>
      </> : feedbackCategories.map((category) => <div className="diag" key={category}><strong>{category}</strong><span>{observations[category as keyof typeof observations]}</span></div>)}</div>{!studyContext && <LimitationNote>Feedback shown here is a fixed diagnostic template, not AI-generated — add a key in Settings for real AI feedback below.</LimitationNote>}<AIFeedbackPanel context={`Challenge: ${seed.challenge} · Audience: ${audience} · Format: ${format}`} instruction="Assess clarity, structure, and whether the explanation would actually land with the stated audience." userResponse={answer} /><button className="small-btn primary top-gap" onClick={() => onComplete({ exerciseType: "forum", challenge: seed.challenge, audience, format, response: answer })}>Continue to the next step →</button></> : <div className="awaiting-feedback"><div className="seal">F</div><h3>The Forum listens before it judges.</h3><p className="meta">Submit a response to reveal specific evidence across ten dimensions.</p></div>}</article>
    </div></div></section>;
}

const RECALL_COPY: Record<RecallStage, { eyebrow: string; title: string; intro: string; prompt: string }> = {
  encounter: { eyebrow: "New material entering the loop", title: "Encounter", intro: "Read once, without trying to hold onto it yet.", prompt: "What is your first reaction? (optional)" },
  recall: { eyebrow: "Before rereading", title: "Recall", intro: "Retrieve from memory before the source is shown again.", prompt: "What do you remember, in your own words?" },
  observe: { eyebrow: "Feedback from reality", title: "Observe", intro: "A principle only earns its keep once it meets a real decision.", prompt: "What happened when you applied this?" },
  revise: { eyebrow: "Willingness to revise", title: "Revise", intro: "Keep it only if it survives the evidence.", prompt: "Revise the statement if the evidence changes it, or confirm it as-is." },
  "retrieve-again": { eyebrow: "Spaced retrieval", title: "Retrieve Again", intro: "Does it still hold together without looking?", prompt: "What do you remember, in your own words?" },
};

export type RetrievalQuality = "blank" | "partial" | "nailed";
export type RecallCheckResult = { exerciseType: "recall-check"; prompt: string; response: string; quality?: RetrievalQuality };

const QUALITY_OPTIONS: Array<{ label: string; quality: RetrievalQuality }> = [
  { label: "Nailed it", quality: "nailed" }, { label: "Partial", quality: "partial" }, { label: "Blank", quality: "blank" },
];

export function RecallCheckView({ stage, sourceRef, onComplete }: {
  stage: RecallStage;
  sourceRef?: SourceRef;
  onComplete: (result: RecallCheckResult) => void;
}) {
  const copy = RECALL_COPY[stage];
  const isRetrieval = stage === "recall" || stage === "retrieve-again";
  const [revealed, setRevealed] = useState(!isRetrieval);
  const [text, setText] = useState(stage === "revise" ? sourceRef?.text ?? "" : "");

  function finish(response: string, quality?: RetrievalQuality) {
    onComplete({ exerciseType: "recall-check", prompt: `${copy.title} · ${sourceRef?.label ?? "practice"}`, response, quality });
  }

  return <section className="view active"><div className="content"><PageHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />
    {(revealed || stage === "encounter" || stage === "observe" || stage === "revise") && sourceRef && <div className="manuscript"><div className="kicker">{sourceRef.label}</div><blockquote>“{sourceRef.text}”</blockquote></div>}
    <article className="card prompt-panel">
      <h2>{copy.prompt}</h2>
      {isRetrieval && !revealed ? <>
        <textarea className="answer" value={text} onChange={(event) => setText(event.target.value)} placeholder="Write what you remember before it's shown again…" />
        <div className="mic-row"><button className="small-btn primary" onClick={() => setRevealed(true)} disabled={!text.trim()}>Reveal & self-rate →</button></div>
      </> : isRetrieval ? <>
        <p className="meta">Your recall: “{text}”</p>
        <div className="constraint-row">{QUALITY_OPTIONS.map(({ label, quality }) => <button key={quality} className="pill" onClick={() => finish(text, quality)}>{label}</button>)}</div>
      </> : <>
        <textarea className="answer" value={text} onChange={(event) => setText(event.target.value)} placeholder={stage === "encounter" ? "Optional — a first reaction is enough." : "Write your answer…"} />
        <div className="mic-row"><button className="small-btn primary" onClick={() => finish(text.trim() || "(no reaction recorded)")} disabled={stage !== "encounter" && !text.trim()}>Continue to the next step →</button></div>
      </>}
    </article>
    <LimitationNote>Self-assessed — there is no AI grading of recall or revision yet; that is planned for a future release.</LimitationNote>
  </div></section>;
}
