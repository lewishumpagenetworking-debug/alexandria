"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar, spaceNames } from "@/components/navigation";
import { NextActionBar } from "@/components/next-action-bar";
import { UniversalCapture } from "@/components/universal-capture";
import { Onboarding, shouldShowOnboarding } from "@/components/onboarding";
import { HomeView } from "@/components/views/home-view";
import { NotesView } from "@/components/views/notes-view";
import { ReviewView } from "@/components/views/review-view";
import { ApplyView } from "@/components/views/apply-view";
import { TasksView } from "@/components/views/tasks-view";
import { ProgressView } from "@/components/views/progress-view";
import { GamePadView } from "@/components/views/gamepad-view";
import { PathView } from "@/components/views/path-view";
import { SettingsView } from "@/components/views/settings-view";
import { CapabilityView, HallsView, LedgerView, LibraryView, ScriptoriumView } from "@/components/views/library-views";
import { FunctionalAtriumView } from "@/components/views/functional-atrium";
import { saveCapture } from "@/lib/capture-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import { registerCard } from "@/lib/retrieval-store";
import { maybeNotify } from "@/lib/growth-store";
import type { CaptureDraft } from "@/models/domain";
import { registerBrowserTools, type AlexandriaSpace } from "@/services/mcp/browser-tools";

const PRIMARY_SPACES: AlexandriaSpace[] = [
  "home", "library", "learn", "notes", "review",
  "knowledge-map", "apply", "tasks", "progress", "gamepad", "settings",
];

const gatedRedirects: Partial<Record<AlexandriaSpace, AlexandriaSpace>> = {
  atrium: "home",
  path: "learn",
  halls: "knowledge-map",
  ledger: "library",
  scriptorium: "notes",
  academy: "progress",
  interrogation: "learn",
  principles: "learn",
  agora: "learn",
  forum: "learn",
};

function hashSpace(): AlexandriaSpace {
  if (typeof window === "undefined") return "home";
  const requested = window.location.hash.slice(1) as AlexandriaSpace;
  if (!requested) return "home";
  return gatedRedirects[requested] ?? (PRIMARY_SPACES.includes(requested as AlexandriaSpace) ? requested : "home");
}

export default function AlexandriaApp() {
  const [active, setActive] = useState<AlexandriaSpace>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const today = useMemo(() => new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date()), []);

  const navigate = useCallback((requested: AlexandriaSpace) => {
    const space = gatedRedirects[requested] ?? requested;
    setActive(space);
    setMenuOpen(false);
    window.history.replaceState(null, "", space === "home" ? window.location.pathname : `#${space}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const capture = useCallback((draft: Omit<CaptureDraft, "id" | "createdAt" | "inputSource">) => {
    const item = saveCapture({ ...draft, inputSource: "keyboard" });
    awardPoints("capture", `Captured a ${item.type.toLowerCase()}`, POINTS.capture, item.id);
    registerCard("capture", item.id, item.type, item.text);
    window.dispatchEvent(new Event("alexandria:data"));
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
    return item;
  }, []);

  useEffect(() => {
    const sync = () => {
      const space = hashSpace();
      setActive(space);
      const requestedHash = window.location.hash.slice(1);
      if (requestedHash && requestedHash !== space) {
        window.history.replaceState(null, "", space === "home" ? window.location.pathname : `#${space}`);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    maybeNotify();
    setShowOnboarding(shouldShowOnboarding());
  }, []);

  useEffect(() => {
    try {
      registerBrowserTools({
        navigate,
        capture: (text, type) => capture({ text, type }),
        startInterrogation: () => navigate("learn"),
      });
    } catch (error) {
      console.warn("Browser MCP registration is unavailable", error);
    }
  }, [capture, navigate]);

  const learnView = <PathView navigate={navigate} />;
  const view = ({
    home: <HomeView navigate={navigate} />,
    library: <LibraryView />,
    learn: learnView,
    notes: <NotesView onCapture={() => setCaptureOpen(true)} navigate={navigate} />,
    review: <ReviewView navigate={navigate} />,
    "knowledge-map": <HallsView />,
    apply: <ApplyView />,
    tasks: <TasksView />,
    progress: <ProgressView />,
    gamepad: <GamePadView />,
    settings: <SettingsView />,
    // Legacy gated — kept so the record is total (all are redirected before setActive)
    atrium: <FunctionalAtriumView navigate={navigate} />,
    path: learnView,
    halls: <HallsView />,
    ledger: <LedgerView />,
    scriptorium: <ScriptoriumView />,
    academy: <CapabilityView />,
    interrogation: learnView,
    principles: learnView,
    agora: learnView,
    forum: learnView,
  } as Record<AlexandriaSpace, React.ReactNode>)[active];

  return (
    <div className="shell">
      <Sidebar active={active} open={menuOpen} onNavigate={navigate} onCapture={() => setCaptureOpen(true)} />
      <div className={`sidebar-backdrop${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(false)} />
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen((v) => !v)} aria-label="Open navigation">☰</button>
          <div className="breadcrumbs">{spaceNames[active]}</div>
          <div className="today">{today}</div>
        </header>
        {view}
      </main>
      <UniversalCapture open={captureOpen} onClose={() => setCaptureOpen(false)} onSave={capture} />
      <div className={`toast${toast ? " show" : ""}`} role="status">Idea captured.</div>
      <NextActionBar active={active} navigate={navigate} hidden={menuOpen} />
      {showOnboarding && (
        <Onboarding onDone={() => setShowOnboarding(false)} navigate={navigate} />
      )}
    </div>
  );
}
