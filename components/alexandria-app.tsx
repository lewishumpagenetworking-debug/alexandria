"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar, spaceNames } from "@/components/navigation";
import { NextActionBar } from "@/components/next-action-bar";
import { UniversalCapture } from "@/components/universal-capture";
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

const spaces = Object.keys(spaceNames) as AlexandriaSpace[];

// The four old Academy exercise routes are gated: any manual hash edit to one of them
// (or any other unreachable step) lands on the Path at whatever step the user actually reached.
const gatedRedirects: Partial<Record<AlexandriaSpace, AlexandriaSpace>> = {
  interrogation: "path", principles: "path", agora: "path", forum: "path",
};

function hashSpace(): AlexandriaSpace {
  if (typeof window === "undefined") return "atrium";
  const requested = window.location.hash.slice(1) as AlexandriaSpace;
  if (!spaces.includes(requested)) return "atrium";
  return gatedRedirects[requested] ?? requested;
}

export default function AlexandriaApp() {
  const [active, setActive] = useState<AlexandriaSpace>("atrium");
  const [menuOpen, setMenuOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const today = useMemo(() => new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date()), []);

  const navigate = useCallback((requested: AlexandriaSpace) => {
    const space = gatedRedirects[requested] ?? requested;
    setActive(space);
    setMenuOpen(false);
    window.history.replaceState(null, "", space === "atrium" ? window.location.pathname : `#${space}`);
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
      if (requestedHash !== space) window.history.replaceState(null, "", space === "atrium" ? window.location.pathname : `#${space}`);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => { maybeNotify(); }, []);

  useEffect(() => {
    try {
      registerBrowserTools({
        navigate,
        capture: (text, type) => capture({ text, type }),
        startInterrogation: () => navigate("path"),
      });
    } catch (error) {
      console.warn("Browser MCP registration is unavailable", error);
    }
  }, [capture, navigate]);

  const pathView = <PathView navigate={navigate} />;
  const view = {
    atrium: <FunctionalAtriumView navigate={navigate} />,
    library: <LibraryView />,
    halls: <HallsView />,
    ledger: <LedgerView />,
    scriptorium: <ScriptoriumView />,
    path: pathView,
    // These four routes are gated and redirected to "path" before `active` is ever set to
    // them (see gatedRedirects in hashSpace/navigate) — kept only so this map stays total
    // over AlexandriaSpace.
    interrogation: pathView,
    principles: pathView,
    agora: pathView,
    forum: pathView,
    academy: <CapabilityView />,
    settings: <SettingsView />,
  }[active];

  return (
    <div className="shell">
      <Sidebar active={active} open={menuOpen} onNavigate={navigate} onCapture={() => setCaptureOpen(true)} />
      <div className={`sidebar-backdrop${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(false)} />
      <main className="main">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Open navigation">☰</button><div className="breadcrumbs">{spaceNames[active]}</div><div className="today">{today}</div></header>
        {view}
      </main>
      <UniversalCapture open={captureOpen} onClose={() => setCaptureOpen(false)} onSave={capture} />
      <div className={`toast${toast ? " show" : ""}`} role="status">Thought preserved for later classification.</div>
      <NextActionBar active={active} navigate={navigate} />
    </div>
  );
}
