"use client";

import { useEffect, useState } from "react";
import { progressLabel } from "@/lib/reading-execution";
import { loadBooks, loadLogs } from "@/lib/application-store";
import { listCaptures } from "@/lib/capture-store";
import { getCurrentStep, getStats, STAGE_LABELS } from "@/lib/path-store";
import { getDueCount } from "@/lib/retrieval-store";
import { getDailyMemoryPlan, isTodayMemoryComplete } from "@/lib/memory-engine";
import { getTotalPoints, getPointsToday } from "@/lib/points-store";
import { listApplications } from "@/lib/apply-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";
import { ReadInsteadCard } from "@/components/read-instead-card";
import { WeeklyReading } from "@/components/weekly-reading";
import { DailyBookWorkflow } from "@/components/daily-book-workflow";
import { BookTallyWorkspace } from "@/components/book-tally-workspace";

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
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = next ? Math.round(((xp - level.min) / (next.min - level.min)) * 100) : 100;
  return { ...level, progress, nextName: next?.name ?? null, nextMin: next?.min ?? null };
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

interface NextAction {
  icon: string;
  title: string;
  context: string;
  why: string;
  space: AlexandriaSpace;
  cta: string;
}

interface DailyProtocol {
  id: string;
  label: string;
  description: string;
  done: boolean;
  space: AlexandriaSpace;
}

export function HomeView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [books, setBooks] = useState(loadBooks());
  const [captures, setCaptures] = useState(listCaptures());
  const [dueCount, setDueCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(getCurrentStep());
  const [stats, setStats] = useState(getStats());
  const [xp, setXp] = useState(getTotalPoints());
  const [xpToday, setXpToday] = useState(getPointsToday());
  const [applications, setApplications] = useState(listApplications());
  const [logs, setLogs] = useState(loadLogs());
  const [memoryPlan, setMemoryPlan] = useState(getDailyMemoryPlan());

  useEffect(() => {
    function sync() {
      setBooks(loadBooks());
      setCaptures(listCaptures());
      setDueCount(getDueCount());
      setCurrentStep(getCurrentStep());
      setStats(getStats());
      setXp(getTotalPoints());
      setXpToday(getPointsToday());
      setApplications(listApplications());
      setLogs(loadLogs());
      setMemoryPlan(getDailyMemoryPlan());
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("alexandria:data", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("alexandria:data", sync);
    };
  }, []);

  const level = getLevel(xp);
  const today = todayISO();
  const logsToday = logs.filter((l) => l.createdAt?.startsWith(today) || l.date === new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date()));
  const capturesToday = captures.filter((c) => c.createdAt?.startsWith(today));
  const appsToday = applications.filter((a) => a.status !== "planned" && (a.attemptedAt?.startsWith(today) || a.createdAt.startsWith(today)));
  const memoryComplete = isTodayMemoryComplete();
  const connectedToday = false; // Knowledge Map connections not yet tracked

  const protocol: DailyProtocol[] = [
    { id: "acquire", label: "Acquire", description: "Read and log a session", done: logsToday.length > 0, space: "library" },
    { id: "capture", label: "Capture", description: "Save an idea or observation", done: capturesToday.length > 0, space: "notes" },
    { id: "retrieve", label: "Memory", description: `${memoryPlan.targetMinutes}-minute adaptive retrieval block`, done: memoryComplete, space: "gamepad" },
    { id: "connect", label: "Connect", description: "Link concepts across sources", done: connectedToday, space: "knowledge-map" },
    { id: "apply", label: "Apply", description: "Use knowledge in a real situation", done: appsToday.length > 0, space: "apply" },
    { id: "learn", label: "Learn", description: "Complete today's learning step", done: stats.completedSteps > 0 && currentStep === null, space: "learn" },
  ];

  const protocolDoneCount = protocol.filter((p) => p.done).length;
  const currentBook = books.find((b) => !b.completed) ?? books[0];

  function resolveNextAction(): NextAction {
    if (books.length === 0) {
      return {
        icon: "📚",
        title: "Add your first book",
        context: "Your Library is empty — everything starts here.",
        why: "Alexandria is built around your actual reading. Add the book you're working through right now and the system comes alive.",
        space: "library",
        cta: "Open Library",
      };
    }
    if (!memoryComplete && memoryPlan.poolCount > 0) {
      return {
        icon: "🧠",
        title: `Complete today's ${memoryPlan.targetMinutes}-minute memory block`,
        context: memoryPlan.focusBookTitle
          ? `Focused relearning · ${memoryPlan.focusBookTitle}`
          : memoryPlan.focusContext
            ? `Context focus · ${memoryPlan.focusContext}`
            : memoryPlan.direction === "reverse"
              ? "Mixed reverse retrieval across the Library"
              : "Mixed retrieval across the Library",
        why: "Retrieval, feedback, and spaced relearning are the highest-priority memory work. Finish the block before treating extra review as optional.",
        space: "gamepad",
        cta: "Start memory block",
      };
    }
    if (dueCount > 0) {
      return {
        icon: "🔁",
        title: `${dueCount} scheduled review${dueCount === 1 ? "" : "s"} remain`,
        context: "Your required memory block is complete; these are additional spaced reviews.",
        why: "Extra due reviews strengthen weak items, but they no longer replace the daily adaptive memory block.",
        space: "review",
        cta: "Open review",
      };
    }
    if (currentStep) {
      return {
        icon: "🧠",
        title: `Learn: ${STAGE_LABELS[currentStep.stage]}`,
        context: currentStep.sourceRef ? `From ${currentStep.sourceRef.label}` : "Continue the daily path",
        why: "Consistent daily practice compounds faster than occasional bursts. Two steps a day means one full learning cycle every two weeks.",
        space: "learn",
        cta: "Open learning session",
      };
    }
    if (capturesToday.length === 0 && captures.length > 20) {
      return {
        icon: "💡",
        title: "Process your capture inbox",
        context: `You have ${captures.length} unclassified ideas.`,
        why: "Captured ideas become knowledge only when reviewed and connected. Spend 5 minutes classifying — it's the difference between a note and an insight.",
        space: "notes",
        cta: "Open inbox",
      };
    }
    if (currentBook) {
      return {
        icon: "📖",
        title: `Continue ${currentBook.title}`,
        context: `${currentBook.author} · ${progressLabel(currentBook)}`,
        why: "The more you read with a note-taking habit, the more your Review queue fills with material worth remembering. Acquisition is the top of the funnel.",
        space: "library",
        cta: "Log a reading session",
      };
    }
    return {
      icon: "✨",
      title: "You're up to date",
      context: "All reviews done, all steps complete.",
      why: "Come back tomorrow. Consistency over time is what separates a reader from a thinker.",
      space: "progress",
      cta: "View your progress",
    };
  }

  const nextAction = resolveNextAction();

  return (
    <section className="view active home-view">
      <div className="home-greeting">
        <div className="home-greeting-text">
          <span className="eyebrow">{greeting()}</span>
          <h1>Here is what matters today.</h1>
          <p className="home-sub">Reading workflow below · Level {level.name} · {xpToday > 0 ? `+${xpToday} XP today` : "no XP yet today"}</p>
        </div>
      </div>

      <div className="content">
        <div className="home-grid">
          <div className="home-main">
            <DailyBookWorkflow />
            <WeeklyReading />
            <BookTallyWorkspace />
            <ReadInsteadCard />
            <article className="next-action-card" onClick={() => navigate(nextAction.space)}>
              <div className="na-icon">{nextAction.icon}</div>
              <div className="na-body">
                <div className="kicker">Next action</div>
                <h2 className="na-title">{nextAction.title}</h2>
                <p className="na-context">{nextAction.context}</p>
                <div className="na-why">
                  <span className="why-label">Why now</span>
                  <p>{nextAction.why}</p>
                </div>
              </div>
              <button className="na-cta" onClick={(e) => { e.stopPropagation(); navigate(nextAction.space); }}>{nextAction.cta} →</button>
            </article>

            <div className="kicker top-gap">Other practice</div>
            <div className="protocol-grid">
              {protocol.map((item) => (
                <button key={item.id} className={`protocol-item${item.done ? " done" : ""}`} onClick={() => navigate(item.space)} title={item.description}>
                  <span className="protocol-check">{item.done ? "✓" : "○"}</span>
                  <span className="protocol-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="home-side">
            <article className="card">
              <div className="kicker">Your level</div>
              <div className="level-display">
                <strong>{level.name}</strong>
                <span className="xp-count">{xp.toLocaleString()} XP</span>
              </div>
              {level.nextName && (
                <div>
                  <div className="level-bar"><span style={{ width: `${level.progress}%` }} /></div>
                  <p className="meta">{level.nextMin! - xp} XP to {level.nextName}</p>
                </div>
              )}
            </article>

            <article className="card">
              <div className="kicker">Today</div>
              <div className="stat-row compact">
                <div className="stat"><b>{stats.currentStreakDays}</b><span>day streak</span></div>
                <div className="stat"><b>{xpToday}</b><span>XP today</span></div>
                <div className="stat"><b>{memoryComplete ? "✓" : memoryPlan.targetMinutes}</b><span>{memoryComplete ? "memory done" : "memory min"}</span></div>
                <div className="stat"><b>{books.length}</b><span>books</span></div>
              </div>
            </article>

            <article className="card">
              <div className="kicker">Other practice · {protocolDoneCount} of 6</div>
              <div className="list">
                {protocol.map((item) => (
                  <div key={item.id} className="list-item protocol-row">
                    <span className={`protocol-status${item.done ? " done" : ""}`}>{item.done ? "✓" : "·"}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
