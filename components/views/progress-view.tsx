"use client";

import { useEffect, useState } from "react";
import { loadBooks, loadLogs } from "@/lib/application-store";
import { listCaptures } from "@/lib/capture-store";
import { getStats } from "@/lib/path-store";
import { getTotalPoints, getPointsToday, listPointEvents, type PointEvent } from "@/lib/points-store";
import { listHighlights, listPrinciples } from "@/lib/library-notes-store";
import { listCards } from "@/lib/retrieval-store";
import { listApplications } from "@/lib/apply-store";

const LEVELS = [
  { name: "Initiate", min: 0 },
  { name: "Reader", min: 100 },
  { name: "Student", min: 300 },
  { name: "Scholar", min: 700 },
  { name: "Thinker", min: 1500 },
  { name: "Synthesist", min: 3000 },
  { name: "Builder", min: 6000 },
  { name: "Polymath", min: 10000 },
];

function getLevel(xp: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) level = l; }
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  return {
    name: level.name,
    level: idx + 1,
    progress: next ? Math.round(((xp - level.min) / (next.min - level.min)) * 100) : 100,
    nextName: next?.name ?? null,
    nextMin: next?.min ?? null,
    xpInLevel: next ? xp - level.min : xp - level.min,
    xpForLevel: next ? next.min - level.min : 0,
  };
}

function categoryLabel(cat: PointEvent["category"]): string {
  const map: Record<PointEvent["category"], string> = {
    "recall-check": "Review", interrogation: "Interrogation", "first-principles": "First Principles",
    agora: "Agora session", forum: "Forum session", "reading-session": "Reading",
    highlight: "Highlight saved", capture: "Idea captured", "book-import": "Book import",
    "loop-lap": "Full loop lap", streak: "Streak bonus",
  };
  return map[cat] ?? cat;
}

export function ProgressView() {
  const [xp, setXp] = useState(0);
  const [xpToday, setXpToday] = useState(0);
  const [history, setHistory] = useState(listPointEvents());
  const [stats, setStats] = useState(getStats());
  const [books, setBooks] = useState(loadBooks());
  const [logs, setLogs] = useState(loadLogs());
  const [captures, setCaptures] = useState(listCaptures());
  const [highlights, setHighlights] = useState(listHighlights());
  const [principles, setPrinciples] = useState(listPrinciples());
  const [cards, setCards] = useState(listCards());
  const [applications, setApplications] = useState(listApplications());

  function sync() {
    setXp(getTotalPoints());
    setXpToday(getPointsToday());
    setHistory(listPointEvents());
    setStats(getStats());
    setBooks(loadBooks());
    setLogs(loadLogs());
    setCaptures(listCaptures());
    setHighlights(listHighlights());
    setPrinciples(listPrinciples());
    setCards(listCards());
    setApplications(listApplications());
  }

  useEffect(() => {
    sync();
    window.addEventListener("alexandria:data", sync);
    return () => window.removeEventListener("alexandria:data", sync);
  }, []);

  const level = getLevel(xp);
  const completedBooks = books.filter((b) => b.completed).length;
  const totalPages = logs.reduce((sum, l) => sum + (l.pages ?? 0), 0);
  const recentHistory = history.slice(0, 20);

  const sessionCounts = stats.sessionsByType;

  return (
    <section className="view active">
      <div className="content">
        <div className="eyebrow">Track</div>
        <h1 className="page-title">Progress</h1>

        <div className="progress-hero">
          <div className="level-hero">
            <div className="level-badge">
              <span className="level-number">{level.level}</span>
            </div>
            <div className="level-info">
              <div className="kicker">Current level</div>
              <h2>{level.name}</h2>
              {level.nextName && <p className="meta">{level.xpInLevel} / {level.xpForLevel} XP to {level.nextName}</p>}
            </div>
          </div>
          <div className="level-bar full"><span style={{ width: `${level.progress}%` }} /></div>

          <div className="stat-row progress-stats">
            <div className="stat"><b>{xp.toLocaleString()}</b><span>Total XP</span></div>
            <div className="stat"><b>{xpToday}</b><span>Today</span></div>
            <div className="stat"><b>{stats.currentStreakDays}</b><span>Day streak</span></div>
            <div className="stat"><b>{stats.longestStreakDays}</b><span>Best streak</span></div>
          </div>
        </div>

        <div className="progress-grid">
          <div className="stack">
            <article className="card">
              <div className="kicker">Knowledge library</div>
              <div className="stat-row compact">
                <div className="stat"><b>{books.length}</b><span>books</span></div>
                <div className="stat"><b>{completedBooks}</b><span>completed</span></div>
                <div className="stat"><b>{totalPages.toLocaleString()}</b><span>pages read</span></div>
                <div className="stat"><b>{logs.length}</b><span>sessions</span></div>
              </div>
            </article>

            <article className="card">
              <div className="kicker">Captured knowledge</div>
              <div className="stat-row compact">
                <div className="stat"><b>{captures.length}</b><span>captures</span></div>
                <div className="stat"><b>{highlights.length}</b><span>highlights</span></div>
                <div className="stat"><b>{principles.length}</b><span>principles</span></div>
                <div className="stat"><b>{applications.length}</b><span>applications</span></div>
              </div>
            </article>

            <article className="card">
              <div className="kicker">Review system</div>
              <div className="stat-row compact">
                <div className="stat"><b>{cards.length}</b><span>cards</span></div>
                <div className="stat"><b>{cards.filter((c) => c.reviewCount > 0).length}</b><span>reviewed</span></div>
                <div className="stat"><b>{Math.round(cards.filter((c) => c.reviewCount > 0).reduce((s, c) => s + c.reviewCount, 0) / Math.max(1, cards.filter((c) => c.reviewCount > 0).length))}</b><span>avg reviews</span></div>
                <div className="stat"><b>{stats.cycleLaps}</b><span>loop laps</span></div>
              </div>
            </article>

            <article className="card">
              <div className="kicker">Learning sessions</div>
              <div className="stat-row compact">
                <div className="stat"><b>{sessionCounts.recallCheck}</b><span>recall</span></div>
                <div className="stat"><b>{sessionCounts.interrogation}</b><span>interrogations</span></div>
                <div className="stat"><b>{sessionCounts.firstPrinciples}</b><span>first principles</span></div>
                <div className="stat"><b>{sessionCounts.agora + sessionCounts.forum}</b><span>expression</span></div>
              </div>
            </article>
          </div>

          <div className="stack">
            <article className="card">
              <div className="kicker">Recent XP</div>
              {recentHistory.length === 0 ? (
                <p className="meta">Complete a learning session, review, or capture to earn XP.</p>
              ) : (
                <div className="list">
                  {recentHistory.map((event) => (
                    <div key={event.id} className="list-item xp-event">
                      <div>
                        <strong>{categoryLabel(event.category)}</strong>
                        <span>{event.label}</span>
                      </div>
                      <span className="xp-badge">+{event.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
