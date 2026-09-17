"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar, spaceNames } from "@/components/navigation";
import { UniversalCapture } from "@/components/universal-capture";
import { AgoraView, FirstPrinciplesView, ForumView, InterrogationView } from "@/components/views/academy-views";
import { AtriumView, CapabilityView, HallsView, LedgerView, LibraryView, ScriptoriumView } from "@/components/views/library-views";
import { saveCapture } from "@/lib/capture-store";
import type { CaptureDraft } from "@/models/domain";
import { registerBrowserTools, type AlexandriaSpace } from "@/services/mcp/browser-tools";

const spaces = Object.keys(spaceNames) as AlexandriaSpace[];

function hashSpace(): AlexandriaSpace {
  if (typeof window === "undefined") return "atrium";
  const requested = window.location.hash.slice(1) as AlexandriaSpace;
  return spaces.includes(requested) ? requested : "atrium";
}

export default function AlexandriaApp() {
  const [active, setActive] = useState<AlexandriaSpace>("atrium");
  const [menuOpen, setMenuOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [interrogationReset, setInterrogationReset] = useState(0);
  const today = useMemo(() => new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date()), []);

  const navigate = useCallback((space: AlexandriaSpace) => {
    setActive(space);
    setMenuOpen(false);
    window.history.replaceState(null, "", space === "atrium" ? window.location.pathname : `#${space}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const capture = useCallback((draft: Omit<CaptureDraft, "id" | "createdAt" | "inputSource">) => {
    const item = saveCapture({ ...draft, inputSource: "keyboard" });
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
    return item;
  }, []);

  useEffect(() => {
    setActive(hashSpace());
    const onHashChange = () => setActive(hashSpace());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    try {
      registerBrowserTools({
        navigate,
        capture: (text, type) => capture({ text, type }),
        startInterrogation: () => { setInterrogationReset((value) => value + 1); navigate("interrogation"); },
      });
    } catch (error) {
      console.warn("Browser MCP registration is unavailable", error);
    }
  }, [capture, navigate]);

  const view = {
    atrium: <AtriumView navigate={navigate} />,
    library: <LibraryView />,
    halls: <HallsView />,
    ledger: <LedgerView />,
    scriptorium: <ScriptoriumView />,
    interrogation: <InterrogationView resetKey={interrogationReset} />,
    principles: <FirstPrinciplesView />,
    agora: <AgoraView />,
    forum: <ForumView />,
    academy: <CapabilityView />,
  }[active];

  return (
    <div className="shell">
      <Sidebar active={active} open={menuOpen} onNavigate={navigate} onCapture={() => setCaptureOpen(true)} />
      <main className="main">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Open navigation">☰</button><div className="breadcrumbs">{spaceNames[active]}</div><div className="today">{today}</div></header>
        {view}
      </main>
      <UniversalCapture open={captureOpen} onClose={() => setCaptureOpen(false)} onSave={capture} />
      <div className={`toast${toast ? " show" : ""}`} role="status">Thought preserved for later classification.</div>
    </div>
  );
}
