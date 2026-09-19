"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  AgoraView, FirstPrinciplesView, ForumView, InterrogationView, RecallCheckView,
  type AgoraResult, type FirstPrinciplesResult, type ForumResult, type InterrogationResult, type RecallCheckResult,
} from "@/components/views/academy-views";
import { completeStep, getCurrentStep, getDailyPath, getStats, STAGE_LABELS, type PathStep, type StepResult } from "@/lib/path-store";
import type { RecallStage } from "@/lib/academy-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function PathView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [batch, setBatch] = useState<PathStep[]>([]);
  const [current, setCurrent] = useState<PathStep | null>(null);
  const [stats, setStats] = useState(() => getStats());

  const refresh = useCallback(() => {
    setBatch(getDailyPath(todayISO()));
    setCurrent(getCurrentStep());
    setStats(getStats());
  }, []);

  useEffect(refresh, [refresh]);

  const handleComplete = useCallback((result: StepResult) => {
    if (!current) return;
    completeStep(current.id, result);
    refresh();
  }, [current, refresh]);

  if (!current) {
    const completedToday = batch.filter((step) => step.status === "completed");
    return <section className="view active"><div className="content">
      <PageHeader eyebrow={`Day ${stats.completedSteps > 0 ? Math.max(1, new Set(batch.map((s) => s.date)).size) : 1} · streak ${stats.currentStreakDays}`} title="Today's path is complete." intro="Come back tomorrow for the next step of the loop. Nothing here can be rushed ahead of schedule." />
      <div className="principles-workbench">{completedToday.map((step) => <article className="principle-stage" key={step.id}><div className="stage-number">✓</div><div><div className="kicker">{STAGE_LABELS[step.stage]}</div><h3>{step.exerciseType}</h3></div></article>)}</div>
      <div className="mic-row top-gap"><span className="voice-note">{stats.cycleLaps} full lap{stats.cycleLaps === 1 ? "" : "s"} of the loop completed · {stats.completedSteps} steps total</span>
        <div className="button-row"><button className="small-btn" onClick={() => navigate("atrium")}>Return to the Atrium</button><button className="small-btn" onClick={() => navigate("library")}>Open the Library</button></div>
      </div>
    </div></section>;
  }

  return <>
    <div className="path-progress" role="img" aria-label={`Step ${batch.findIndex((s) => s.id === current.id) + 1} of ${batch.length}`}>
      {batch.map((step) => <span key={step.id} className={`path-dot${step.status === "completed" ? " done" : step.id === current.id ? " active" : ""}`} />)}
      <span className="path-progress-label">{STAGE_LABELS[current.stage]} · step {batch.findIndex((s) => s.id === current.id) + 1} of {batch.length}</span>
    </div>
    {current.exerciseType === "interrogation" && <InterrogationView key={current.id} onComplete={(result: InterrogationResult) => handleComplete(result)} />}
    {current.exerciseType === "first-principles" && <FirstPrinciplesView key={current.id} stage={current.stage as "reduce" | "rebuild"} priorWork={current.stage === "rebuild" ? current.sourceRef : undefined} onComplete={(result: FirstPrinciplesResult) => handleComplete(result)} />}
    {current.exerciseType === "agora" && <AgoraView key={current.id} onComplete={(result: AgoraResult) => handleComplete(result)} />}
    {current.exerciseType === "forum" && <ForumView key={current.id} onComplete={(result: ForumResult) => handleComplete(result)} />}
    {current.exerciseType === "recall-check" && <RecallCheckView key={current.id} stage={current.stage as RecallStage} sourceRef={current.sourceRef} onComplete={(result: RecallCheckResult) => handleComplete(result)} />}
  </>;
}
