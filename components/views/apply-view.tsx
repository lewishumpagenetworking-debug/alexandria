"use client";

import { useEffect, useState } from "react";
import { listPrinciples } from "@/lib/library-notes-store";
import { listApplications, addApplication, updateOutcome, type KnowledgeApplication } from "@/lib/apply-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import type { Principle } from "@/models/domain";

type Mode = "list" | "record";

export function ApplyView() {
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [applications, setApplications] = useState<KnowledgeApplication[]>([]);
  const [mode, setMode] = useState<Mode>("list");
  const [selected, setSelected] = useState<Principle | null>(null);
  const [freeText, setFreeText] = useState("");
  const [context, setContext] = useState("");
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const [filter, setFilter] = useState<"principles" | "recent">("principles");

  function sync() {
    setPrinciples(listPrinciples());
    setApplications(listApplications());
  }

  useEffect(() => {
    sync();
    window.addEventListener("alexandria:data", sync);
    return () => window.removeEventListener("alexandria:data", sync);
  }, []);

  function startRecord(principle?: Principle) {
    setSelected(principle ?? null);
    setFreeText(principle ? "" : "");
    setContext("");
    setAction("");
    setMode("record");
  }

  function submitApplication() {
    const text = selected?.statement ?? freeText.trim();
    if (!text || !context.trim() || !action.trim()) return;
    const app = addApplication({
      principleText: text,
      principleId: selected?.id,
      context: context.trim(),
      action: action.trim(),
      outcome: outcome.trim() || undefined,
    });
    void app;
    awardPoints("agora", "Recorded a knowledge application", POINTS.agora);
    window.dispatchEvent(new Event("alexandria:data"));
    setMode("list");
    sync();
  }

  const recentApps = applications.slice(0, 10);

  if (mode === "record") {
    return (
      <section className="view active">
        <div className="content">
          <button className="ghost-btn back-btn" onClick={() => setMode("list")}>← Back</button>
          <div className="eyebrow">Apply</div>
          <h1 className="page-title">Record an application</h1>
          <article className="card apply-form">
            <div className="form-group">
              <label>Knowledge used</label>
              {selected ? (
                <div className="principle-ref">
                  <blockquote>{selected.statement}</blockquote>
                  <button className="ghost-btn small" onClick={() => setSelected(null)}>Remove — enter freeform</button>
                </div>
              ) : (
                <textarea
                  className="answer"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Describe the idea, principle, or insight you applied…"
                />
              )}
            </div>
            <div className="form-group">
              <label>Context <span className="req">*</span></label>
              <textarea
                className="answer short"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="When and where did you apply this? What was the situation?"
              />
            </div>
            <div className="form-group">
              <label>What you did <span className="req">*</span></label>
              <textarea
                className="answer short"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="What specific action or decision did you take because of this knowledge?"
              />
            </div>
            <div className="form-group">
              <label>Outcome <span className="optional">(add later if unknown)</span></label>
              <textarea
                className="answer short"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="What happened? Did it work? What would you change?"
              />
            </div>
            <div className="button-row">
              <button className="small-btn" onClick={() => setMode("list")}>Cancel</button>
              <button
                className="small-btn primary"
                disabled={!(selected?.statement || freeText.trim()) || !context.trim() || !action.trim()}
                onClick={submitApplication}
              >
                Save application
              </button>
            </div>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="content">
        <div className="page-header-row">
          <div>
            <div className="eyebrow">Knowledge</div>
            <h1 className="page-title">Apply</h1>
            <p className="page-intro">Knowledge becomes capability when you use it. Record where, when, and how.</p>
          </div>
          <button className="small-btn primary" onClick={() => startRecord()}>+ Record application</button>
        </div>

        <div className="tab-row">
          <button className={`tab-btn${filter === "principles" ? " active" : ""}`} onClick={() => setFilter("principles")}>
            Principles to apply {principles.length > 0 && <span className="tab-count">{principles.length}</span>}
          </button>
          <button className={`tab-btn${filter === "recent" ? " active" : ""}`} onClick={() => setFilter("recent")}>
            Recent applications {recentApps.length > 0 && <span className="tab-count">{recentApps.length}</span>}
          </button>
        </div>

        {filter === "principles" && (
          principles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚖️</div>
              <h3>No principles yet</h3>
              <p>Principles are extracted during Learn sessions or imported. Once you have some, you can record where you applied them in the real world.</p>
            </div>
          ) : (
            <div className="apply-list">
              {principles.map((p) => {
                const appCount = applications.filter((a) => a.principleId === p.id).length;
                return (
                  <article key={p.id} className="card apply-principle">
                    <p className="principle-statement">{p.statement}</p>
                    {p.explanation && <p className="meta">{p.explanation}</p>}
                    <div className="apply-principle-footer">
                      <span className={`pill small state-${p.state}`}>{p.state}</span>
                      {appCount > 0 && <span className="meta">applied {appCount}×</span>}
                      <button className="action-link" onClick={() => startRecord(p)}>Record application →</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        )}

        {filter === "recent" && (
          recentApps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>No applications recorded yet</h3>
              <p>When you use an idea in a real decision, conversation, or project, record it here. The outcome — even if unknown — teaches you whether the principle holds.</p>
              <button className="small-btn primary" onClick={() => startRecord()}>Record your first application</button>
            </div>
          ) : (
            <div className="apply-list">
              {recentApps.map((app) => (
                <article key={app.id} className="card apply-record">
                  <blockquote className="apply-principle-text">{app.principleText}</blockquote>
                  <div className="apply-details">
                    <div><span className="recall-label">Context</span><p>{app.context}</p></div>
                    <div><span className="recall-label">Action</span><p>{app.action}</p></div>
                    {app.outcome ? (
                      <div><span className="recall-label">Outcome</span><p>{app.outcome}</p></div>
                    ) : (
                      <div>
                        <span className="recall-label">Outcome</span>
                        <OutcomeEditor appId={app.id} onSave={sync} />
                      </div>
                    )}
                  </div>
                  <p className="meta">{new Date(app.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                </article>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  );
}

function OutcomeEditor({ appId, onSave }: { appId: string; onSave: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  if (!editing) return <button className="action-link" onClick={() => setEditing(true)}>Add outcome →</button>;
  return (
    <div>
      <textarea className="answer short" value={value} onChange={(e) => setValue(e.target.value)} placeholder="What happened?" autoFocus />
      <div className="button-row" style={{ marginTop: 8 }}>
        <button className="small-btn" onClick={() => setEditing(false)}>Cancel</button>
        <button className="small-btn primary" disabled={!value.trim()} onClick={() => { updateOutcome(appId, value.trim()); onSave(); setEditing(false); }}>Save</button>
      </div>
    </div>
  );
}
