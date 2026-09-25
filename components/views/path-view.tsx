"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  AgoraView, FirstPrinciplesView, ForumView, InterrogationView, RecallCheckView,
  type AgoraResult, type FirstPrinciplesResult, type ForumResult, type InterrogationResult, type RecallCheckResult,
} from "@/components/views/academy-views";
import { completeStep, getCurrentStep, getDailyPath, getStats, recordSessionResult, rotateStepSource, STAGE_LABELS, type PathStep, type StepResult } from "@/lib/path-store";
import type { RecallStage } from "@/lib/academy-store";
import { getPointsToday, getTotalPoints } from "@/lib/points-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";
import { listLearningDrafts, type LearningDraft } from "@/lib/learning-draft-store";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function PathView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [batch, setBatch] = useState<PathStep[]>([]);
  const [current, setCurrent] = useState<PathStep | null>(null);
  const [stats, setStats] = useState(() => getStats());
  const [pointsToday, setPointsToday] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<LearningDraft[]>([]);
  const [resumeDraft, setResumeDraft] = useState<LearningDraft | null>(null);

  const refresh = useCallback(() => {
    setBatch(getDailyPath(todayISO()));
    setCurrent(getCurrentStep());
    setStats(getStats());
    setPointsToday(getPointsToday());
    setSavedDrafts(listLearningDrafts().filter((draft) => draft.deferred));
  }, []);

  useEffect(refresh, [refresh]);
  useEffect(() => {
    const syncDrafts = () => setSavedDrafts(listLearningDrafts().filter((draft) => draft.deferred));
    window.addEventListener("alexandria:drafts", syncDrafts);
    return () => window.removeEventListener("alexandria:drafts", syncDrafts);
  }, []);

  const handleComplete = useCallback((result: StepResult) => {
    if (!current) return;
    const outcome = completeStep(current.id, result);
    const totalPoints = outcome.pointsAwarded.reduce((sum, event) => sum + event.points, 0);
    const bestLine = outcome.newBests.map((best) => `New record: ${best.label}`).join(" · ");
    setToast([`+${totalPoints} points`, bestLine].filter(Boolean).join(" · "));
    window.setTimeout(() => setToast(null), 3200);
    refresh();
  }, [current, refresh]);

  const saveCurrentForLater = useCallback(() => {
    if (!current) return;
    rotateStepSource(current.id);
    setToast("Draft saved for later · another knowledge item selected");
    window.setTimeout(() => setToast(null), 2800);
    refresh();
  }, [current, refresh]);

  if (resumeDraft?.exerciseType === "interrogation" && resumeDraft.sourceRef) {
    return <InterrogationView
      key={resumeDraft.id}
      passage={{ text: resumeDraft.sourceRef.text, source: resumeDraft.sourceRef.label }}
      sourceRef={resumeDraft.sourceRef}
      draftKey={resumeDraft.stepId}
      onComplete={(result: InterrogationResult) => {
        recordSessionResult(result, `Saved draft · ${resumeDraft.sourceRef?.label ?? "Interrogation"}`);
        setResumeDraft(null);
        refresh();
      }}
    />;
  }

  if (!current) {
    const completedToday = batch.filter((step) => step.status === "completed");
    return <section className="view active"><div className="content">
      <PageHeader eyebrow={`Day ${stats.completedSteps > 0 ? Math.max(1, new Set(batch.map((s) => s.date)).size) : 1} · streak ${stats.currentStreakDays}`} title="Today's path is complete." intro="Come back tomorrow for the next step of the loop. Nothing here can be rushed ahead of schedule." />
      <div className="principles-workbench">{completedToday.map((step) => <article className="principle-stage" key={step.id}><div className="stage-number">✓</div><div><div className="kicker">{STAGE_LABELS[step.stage]}</div><h3>{step.exerciseType}</h3></div></article>)}</div>
      <div className="mic-row top-gap"><span className="voice-note">{pointsToday} points today · {getTotalPoints()} total · {stats.cycleLaps} full lap{stats.cycleLaps === 1 ? "" : "s"} of the loop completed</span>
        <div className="button-row"><button className="small-btn" onClick={() => navigate("atrium")}>Return to the Atrium</button><button className="small-btn" onClick={() => navigate("library")}>Open the Library</button></div>
      </div>
    </div></section>;
  }

  return <>
    <div className="path-progress" role="img" aria-label={`Step ${batch.findIndex((s) => s.id === current.id) + 1} of ${batch.length}`}>
      {batch.map((step) => <span key={step.id} className={`path-dot${step.status === "completed" ? " done" : step.id === current.id ? " active" : ""}`} />)}
      <span className="path-progress-label">{STAGE_LABELS[current.stage]} · step {batch.findIndex((s) => s.id === current.id) + 1} of {batch.length}</span>
      <span className="path-progress-points">{pointsToday} pts today · streak {stats.currentStreakDays}</span>
    </div>
    {savedDrafts.length > 0 && <div className="saved-learning-strip">
      <div><strong>Saved for later</strong><span>{savedDrafts.length} unfinished {savedDrafts.length === 1 ? "draft" : "drafts"}</span></div>
      <div className="saved-learning-items">{savedDrafts.slice(0, 4).map((draft) => <button key={draft.id} className="pill" onClick={() => setResumeDraft(draft)}>{draft.sourceRef?.label ?? "Resume draft"} · {new Date(draft.savedAt).toLocaleDateString("en-GB")}</button>)}</div>
    </div>}
    {current.exerciseType === "interrogation" && <InterrogationView
      key={`${current.id}:${current.sourceRef?.id ?? "none"}`}
      passage={current.sourceRef ? { text: current.sourceRef.text, source: current.sourceRef.label } : undefined}
      sourceRef={current.sourceRef}
      draftKey={current.id}
      onSaveForLater={saveCurrentForLater}
      onComplete={(result: InterrogationResult) => handleComplete(result)}
    />}
    {current.exerciseType === "first-principles" && <FirstPrinciplesView key={current.id} stage={current.stage as "reduce" | "rebuild"} priorWork={current.stage === "rebuild" ? current.sourceRef : undefined} onComplete={(result: FirstPrinciplesResult) => handleComplete(result)} />}
    {current.exerciseType === "agora" && <AgoraView key={current.id} onComplete={(result: AgoraResult) => handleComplete(result)} />}
    {current.exerciseType === "forum" && <ForumView key={current.id} onComplete={(result: ForumResult) => handleComplete(result)} />}
    {current.exerciseType === "recall-check" && <RecallCheckView key={current.id} stage={current.stage as RecallStage} sourceRef={current.sourceRef} onComplete={(result: RecallCheckResult) => handleComplete(result)} />}
    {toast && <div className="points-toast" role="status">{toast}</div>}
  </>;
}
